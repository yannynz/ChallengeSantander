package com.credito.core.controller;

import com.credito.core.client.MlServiceClient;
import com.credito.core.model.Empresa;
import com.credito.core.model.ScoreRisco; 
import com.credito.core.repository.EmpresaRepository;
import com.credito.core.repository.ScoreRiscoRepository;
import java.time.LocalDateTime;

import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/empresas")
public class EmpresaController {

    private final EmpresaRepository empresaRepo;
    private final MlServiceClient mlClient;
    private final ScoreRiscoRepository scoreRiscoRepo;

    public EmpresaController(EmpresaRepository empresaRepo, MlServiceClient mlClient, ScoreRiscoRepository scoreRiscoRepo) {
        this.empresaRepo = empresaRepo;
        this.mlClient = mlClient;
                this.scoreRiscoRepo = scoreRiscoRepo;
    }

    @GetMapping("/{id}/score")
public Map<String, Object> getScore(@PathVariable String id) {
    Empresa emp = empresaRepo.findById(id).orElseThrow();

    Map<String, Object> features = Map.of(
        "idade", 5,
        "vl_fatu", 100000,
        "vl_sldo", 20000
    );

    Map<String, Object> result = mlClient.calcularScore(
        Map.of("features", features, "modelo", "rf")
    );

    // persistir score
    ScoreRisco score = new ScoreRisco();
    score.setEmpresaId(id);
    score.setScore(((Number) result.get("score")).doubleValue());
    score.setModelo((String) result.get("modelo"));
    score.setVersao((String) result.get("versao"));
    score.setCriadoEm(LocalDateTime.now());
    scoreRiscoRepo.save(score);

    return result;
}

    @GetMapping("/{id}/rede")
    public Map<String, Object> getRede(@PathVariable String id) {
        Map<String, Object> body = Map.of(
            "edges", List.of(
                Map.of("source", id.toString(), "target", "200", "weight", 100.0),
                Map.of("source", "200", "target", id.toString(), "weight", 50.0)
            )
        );
        return mlClient.calcularCentralidades(body);
    }
    
    @GetMapping
public List<Empresa> listarEmpresas() {
    return empresaRepo.findAll();
}

@GetMapping("/{id}")
public Empresa getEmpresa(@PathVariable String id) {
    return empresaRepo.findById(id).orElseThrow();
}

}

