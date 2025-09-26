// src/main/java/com/credito/core/model/EmpresaFinanceiro.java
package com.credito.core.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "empresa_financeiro")
public class EmpresaFinanceiro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // TEXT no banco
    @Column(name = "empresa_id", nullable = false)
    private String empresaId;

    // data do snapshot financeiro; ajuste se seu campo tiver outro nome
    @Column(name = "dt_ref", nullable = false)
    private LocalDate dtRef;

    @Column(name = "vl_fatu")
    private Double vlFatu;

    @Column(name = "vl_sldo")
    private Double vlSldo;

    // Getters e Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmpresaId() { return empresaId; }
    public void setEmpresaId(String empresaId) { this.empresaId = empresaId; }

    public LocalDate getDtRef() { return dtRef; }
    public void setDtRef(LocalDate dtRef) { this.dtRef = dtRef; }

    public Double getVlFatu() { return vlFatu; }
    public void setVlFatu(Double vlFatu) { this.vlFatu = vlFatu; }

    public Double getVlSldo() { return vlSldo; }
    public void setVlSldo(Double vlSldo) { this.vlSldo = vlSldo; }
}
