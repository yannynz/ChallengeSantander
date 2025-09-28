package com.credito.core.service;

import com.credito.core.client.MlServiceClient;
import com.credito.core.model.dto.DecisaoResponse;
import com.credito.core.model.DecisaoCredito;
import com.credito.core.model.Empresa;
import com.credito.core.model.EmpresaFinanceiro;
import com.credito.core.repository.DecisaoCreditoRepository;
import com.credito.core.repository.EmpresaFinanceiroRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.Map;

@Service
public class DecisaoService {

    private static final Logger log = LoggerFactory.getLogger(DecisaoService.class);

    private final EmpresaResolverService empresaResolver;
    private final EmpresaFinanceiroRepository finRepo;
    private final DecisaoCreditoRepository decisaoRepo;
    private final MlServiceClient mlClient;

    @Value("${credito.score.threshold:0.70}")
    private double threshold;

    @Value("${credito.limite.fatorFaturamento:0.20}")
    private double fatorFaturamento;

    @Value("${credito.limite.minimo:1000.0}")
    private double limiteMinimo;

    @Value("${credito.moedaPadrao:BRL}")
    private String moedaPadrao;

    public DecisaoService(EmpresaResolverService empresaResolver,
                          EmpresaFinanceiroRepository finRepo,
                          DecisaoCreditoRepository decisaoRepo,
                          MlServiceClient mlClient) {
        this.empresaResolver = empresaResolver;
        this.finRepo = finRepo;
        this.decisaoRepo = decisaoRepo;
        this.mlClient = mlClient;
    }

    @Transactional
    public DecisaoResponse decidir(String empresaIdentifier) {
        Empresa emp = empresaResolver.resolve(empresaIdentifier);
        String empresaId = emp.getId();

        EmpresaFinanceiro fin = finRepo.findTopByEmpresaIdOrderByDtRefDesc(empresaId)
                .orElseThrow(() -> new IllegalStateException("Sem dados financeiros para empresa: " + empresaId));

        int idade = 0;
        if (emp.getDtAbrt() != null) {
            idade = Period.between(emp.getDtAbrt(), LocalDate.now()).getYears();
        }

        double faturamento = fin.getVlFatu() != null ? fin.getVlFatu() : 0.0;
        double saldo = fin.getVlSldo() != null ? fin.getVlSldo() : 0.0;

        Map<String, Object> features = Map.of(
                "idade", idade,
                "vl_fatu", faturamento,
                "vl_sldo", saldo
        );

        Map<String, Object> result = mlClient.calcularScore(
                Map.of("features", features, "modelo", "rf")
        );

        double score = ((Number) result.get("score")).doubleValue();

        boolean aprovado = score >= threshold;
        double limite = aprovado
                ? Math.max(limiteMinimo, fatorFaturamento * faturamento)
                : 0.0;

        String motivo = aprovado
                ? "Score ≥ threshold (" + String.format("%.2f", score) + " ≥ " + String.format("%.2f", threshold) + ")"
                : "Score < threshold (" + String.format("%.2f", score) + " < " + String.format("%.2f", threshold) + ")";

        DecisaoCredito ent = new DecisaoCredito();
        ent.setEmpresaId(empresaId);
        ent.setDtDecisao(LocalDateTime.now());
        ent.setScore(score);
        ent.setAprovacao(aprovado);
        ent.setLimite(limite);
        ent.setMoeda(moedaPadrao);
        ent.setMotivo(motivo);
        ent.setCriadoEm(LocalDateTime.now());
        ent.setDecisao(aprovado ? "APROVADO" : "REPROVADO");

        DecisaoCredito persisted = decisaoRepo.save(ent);

        log.info("Decisão gerada empresaId={}, score={}, aprovado={}, limite={}", empresaId, score, aprovado, limite);

        return new DecisaoResponse(
                persisted.getId(),
                persisted.getEmpresaId(),
                persisted.getDtDecisao(),
                persisted.getScore(),
                persisted.getAprovacao(),
                persisted.getLimite(),
                persisted.getMoeda(),
                persisted.getMotivo(),
                persisted.getDecisao()
        );
    }
}
