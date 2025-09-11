// src/main/java/com/credito/core/controller/DecisaoController.java
package com.credito.core.controller;

import com.credito.core.model.dto.DecisaoCreateRequest;
import com.credito.core.model.dto.DecisaoResponse;
import com.credito.core.model.DecisaoCredito;
import com.credito.core.repository.DecisaoCreditoRepository;
import com.credito.core.service.DecisaoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/decisoes")
public class DecisaoController {

    private final DecisaoService decisaoService;
    private final DecisaoCreditoRepository decisaoRepo;

    public DecisaoController(DecisaoService decisaoService,
                             DecisaoCreditoRepository decisaoRepo) {
        this.decisaoService = decisaoService;
        this.decisaoRepo = decisaoRepo;
    }

    // cria decisão calculando score no ML e aplicando regras do PRD
    @PostMapping
    public DecisaoResponse criar(@Valid @RequestBody DecisaoCreateRequest req) {
        return decisaoService.decidir(req.empresaId());
    }

    // lista decisões já persistidas
    @GetMapping
    public List<DecisaoCredito> listar() {
        return decisaoRepo.findAll();
    }
}

