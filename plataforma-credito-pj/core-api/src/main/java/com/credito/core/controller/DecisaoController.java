package com.credito.core.controller;

import com.credito.core.model.DecisaoCredito;
import com.credito.core.repository.DecisaoCreditoRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/decisoes")
public class DecisaoController {

    private final DecisaoCreditoRepository decisaoRepo;

    public DecisaoController(DecisaoCreditoRepository decisaoRepo) {
        this.decisaoRepo = decisaoRepo;
    }

    @PostMapping
    public DecisaoCredito criarDecisao(@RequestBody DecisaoCredito d) {
        d.setCriadoEm(LocalDateTime.now());
        return decisaoRepo.save(d);
    }

    @GetMapping
    public List<DecisaoCredito> listarDecisoes() {
        return decisaoRepo.findAll();
    }
}

