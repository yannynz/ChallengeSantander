// src/main/java/com/credito/core/controller/DecisaoController.java
package com.credito.core.controller;

import com.credito.core.model.DecisaoCredito;
import com.credito.core.model.Empresa;
import com.credito.core.model.dto.DecisaoCreateRequest;
import com.credito.core.model.dto.DecisaoResponse;
import com.credito.core.repository.DecisaoCreditoRepository;
import com.credito.core.service.DecisaoService;
import com.credito.core.service.EmpresaResolverService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/decisoes")
public class DecisaoController {

    private static final Logger log = LoggerFactory.getLogger(DecisaoController.class);

    private final DecisaoService decisaoService;
    private final DecisaoCreditoRepository decisaoRepo;
    private final EmpresaResolverService empresaResolver;

    public DecisaoController(DecisaoService decisaoService,
                             DecisaoCreditoRepository decisaoRepo,
                             EmpresaResolverService empresaResolver) {
        this.decisaoService = decisaoService;
        this.decisaoRepo = decisaoRepo;
        this.empresaResolver = empresaResolver;
    }

    // cria decisão calculando score no ML e aplicando regras do PRD
    @PostMapping
    public DecisaoResponse criar(@Valid @RequestBody DecisaoCreateRequest req) {
        return decisaoService.decidir(req.empresaId());
    }

    // lista decisões já persistidas (com filtro opcional por empresa)
    @GetMapping
    public List<DecisaoCredito> listar(
            @RequestParam(name = "empresaId", required = false) String empresaId,
            @RequestParam(name = "limit", required = false, defaultValue = "50") Integer limit
    ) {
        int take = Math.max(1, Math.min(limit == null ? 50 : limit, 200));

        if (empresaId != null && !empresaId.trim().isEmpty()) {
            Empresa empresa = empresaResolver.resolve(empresaId);
            String resolvedId = empresa.getId();
            DecisaoCredito atual = decisaoService.obterDecisaoAtualPorId(resolvedId);

            if (atual == null) {
                try {
                    log.info("Nenhuma decisão encontrada para {}. Gerando automaticamente via serviço de crédito.", resolvedId);
                    decisaoService.decidir(resolvedId);
                    atual = decisaoService.obterDecisaoAtualPorId(resolvedId);
                } catch (Exception ex) {
                    log.warn("Falha ao gerar decisão automática para {}: {}", resolvedId, ex.getMessage());
                }
            }

            if (atual == null) {
                return List.of();
            }

            return List.of(atual);
        }

        Comparator<DecisaoCredito> porDataDesc = Comparator
                .comparing(DecisaoCredito::getDtDecisao, Comparator.nullsLast(Comparator.naturalOrder()))
                .reversed();

        List<DecisaoCredito> todos = decisaoRepo.findAll()
                .stream()
                .sorted(porDataDesc)
                .toList();

        List<DecisaoCredito> resposta = new ArrayList<>();
        Set<String> vistos = new HashSet<>();

        for (DecisaoCredito registro : todos) {
            if (resposta.size() >= take) {
                break;
            }

            String key = registro.getEmpresaId();
            if (key == null || key.trim().isEmpty()) {
                resposta.add(registro);
                continue;
            }

            if (vistos.contains(key)) {
                continue;
            }

            DecisaoCredito principal = decisaoService.obterDecisaoAtualPorId(key);
            if (principal != null) {
                resposta.add(principal);
                vistos.add(key);
            }
        }

        return resposta;
    }
}
