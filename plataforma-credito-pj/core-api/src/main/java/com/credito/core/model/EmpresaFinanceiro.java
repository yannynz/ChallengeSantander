package com.credito.core.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "empresa_financeiro")
public class EmpresaFinanceiro {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer empresaId;
    private LocalDate dtRef;
    private Double vlFatu;
    private Double vlSldo;

    // Getters e Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getEmpresaId() { return empresaId; }
    public void setEmpresaId(Integer empresaId) { this.empresaId = empresaId; }

    public LocalDate getDtRef() { return dtRef; }
    public void setDtRef(LocalDate dtRef) { this.dtRef = dtRef; }

    public Double getVlFatu() { return vlFatu; }
    public void setVlFatu(Double vlFatu) { this.vlFatu = vlFatu; }

    public Double getVlSldo() { return vlSldo; }
    public void setVlSldo(Double vlSldo) { this.vlSldo = vlSldo; }
}

