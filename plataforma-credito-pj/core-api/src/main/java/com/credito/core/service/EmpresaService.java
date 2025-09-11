package com.credito.core.service;

import com.credito.core.model.Empresa;
import com.credito.core.repository.EmpresaRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class EmpresaService {
    private final EmpresaRepository repo;

    public EmpresaService(EmpresaRepository repo) {
        this.repo = repo;
    }

    public Optional<Empresa> findById(Integer id) {
        return repo.findById(id);
    }
}

