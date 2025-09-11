package com.credito.core.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "empresa")
public class Empresa {
    @Id
    private Integer id;

    private String dsCnae;
    private LocalDate dtAbrt;

    // Getters e Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getDsCnae() { return dsCnae; }
    public void setDsCnae(String dsCnae) { this.dsCnae = dsCnae; }

    public LocalDate getDtAbrt() { return dtAbrt; }
    public void setDtAbrt(LocalDate dtAbrt) { this.dtAbrt = dtAbrt; }
}

