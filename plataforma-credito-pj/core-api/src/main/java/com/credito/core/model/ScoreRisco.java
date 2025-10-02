package com.credito.core.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "score_risco")
public class ScoreRisco {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private String empresaId;

    @Column(name = "score")
    private Double score;

    @Column(name = "modelo")
    private String modelo;

    @Column(name = "versao_modelo")
    private String versao;

    @Column(name = "dt_calc", nullable = false)
    private LocalDateTime dtCalc;

    @Column(name = "threshold")
    private Double threshold;

    @Column(name = "auc_valid")
    private Double aucValid;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmpresaId() { return empresaId; }
    public void setEmpresaId(String empresaId) { this.empresaId = empresaId; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }

    public String getVersao() { return versao; }
    public void setVersao(String versao) { this.versao = versao; }

    public LocalDateTime getDtCalc() { return dtCalc; }
    public void setDtCalc(LocalDateTime dtCalc) { this.dtCalc = dtCalc; }

    public Double getThreshold() { return threshold; }
    public void setThreshold(Double threshold) { this.threshold = threshold; }

    public Double getAucValid() { return aucValid; }
    public void setAucValid(Double aucValid) { this.aucValid = aucValid; }
}
