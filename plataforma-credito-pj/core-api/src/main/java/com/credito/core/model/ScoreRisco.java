package com.credito.core.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "score_risco")
public class ScoreRisco {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private String id;

    private String empresaId;
    private Double score;
    private String modelo;
    private String versao;
    private LocalDateTime criadoEm;

    // Getters e Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmpresaId() { return empresaId; }
    public void setEmpresaId(String empresaId) { this.empresaId = empresaId; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }

    public String getVersao() { return versao; }
    public void setVersao(String versao) { this.versao = versao; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}

