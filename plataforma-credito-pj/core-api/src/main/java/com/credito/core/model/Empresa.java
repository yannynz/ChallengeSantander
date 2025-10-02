// src/main/java/com/credito/core/model/Empresa.java
package com.credito.core.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "empresa")
public class Empresa {
    @Id
    @Column(name = "id", nullable = false)   // TEXT no banco
    private String id;

    @Column(name = "cnpj")
    private String cnpj;

    @Column(name = "ds_cnae")
    private String dsCnae;

    @Column(name = "dt_abrt")
    private LocalDate dtAbrt;

    // Getters e Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDsCnae() { return dsCnae; }
    public void setDsCnae(String dsCnae) { this.dsCnae = dsCnae; }

    public LocalDate getDtAbrt() { return dtAbrt; }
    public void setDtAbrt(LocalDate dtAbrt) { this.dtAbrt = dtAbrt; }

    public String getCnpj() { return cnpj; }
    public void setCnpj(String cnpj) { this.cnpj = cnpj; }
}
