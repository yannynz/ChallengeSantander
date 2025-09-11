package com.credito.core.service;

import com.credito.core.model.DecisaoCredito;
import com.credito.core.repository.DecisaoCreditoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class DecisaoService {
    private final DecisaoCreditoRepository repo;

    public DecisaoService(DecisaoCreditoRepository repo) {
        this.repo = repo;
    }

    public DecisaoCredito criar(DecisaoCredito d) {
        d.setCriadoEm(LocalDateTime.now());
        return repo.save(d);
    }
}

