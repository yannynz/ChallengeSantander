package com.credito.core.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "decisao_credito")
public class DecisaoCredito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private String id;

    // TEXT no banco
    @Column(name = "empresa_id", nullable = false)
    private String empresaId;

    @Column(name = "dt_decisao", nullable = false)
    private LocalDateTime dtDecisao;

    @Column(name = "score")
    private Double score;

    @Column(name = "aprovacao", nullable = false)
    private Boolean aprovacao;

    @Column(name = "limite")
    private Double limite;

    @Column(name = "moeda")
    private String moeda;

    @Column(name = "motivo")
    private String motivo;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "decisao")
    private String decisao;

    // Getters e Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmpresaId() { return empresaId; }
    public void setEmpresaId(String empresaId) { this.empresaId = empresaId; }

    public String getDecisao() { return decisao; }
    public void setDecisao(String decisao) { this.decisao = decisao; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }

    public LocalDateTime getDtDecisao() { return dtDecisao; }
    public void setDtDecisao(LocalDateTime dtDecisao) { this.dtDecisao = dtDecisao; }

    public Boolean getAprovacao() { return aprovacao; }
    public void setAprovacao(Boolean aprovacao) { this.aprovacao = aprovacao; }

    public Double getLimite() { return limite; }
    public void setLimite(Double limite) { this.limite = limite; }

    public String getMoeda() { return moeda; }
    public void setMoeda(String moeda) { this.moeda = moeda; }

    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }

}

