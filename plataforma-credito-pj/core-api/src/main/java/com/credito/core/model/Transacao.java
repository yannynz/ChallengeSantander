package com.credito.core.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "transacao")
public class Transacao {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer idPgto;
    private Integer idRcbe;
    private Double vl;
    private String dsTran;
    private LocalDate dtRef;

    // Getters e Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getIdPgto() { return idPgto; }
    public void setIdPgto(Integer idPgto) { this.idPgto = idPgto; }

    public Integer getIdRcbe() { return idRcbe; }
    public void setIdRcbe(Integer idRcbe) { this.idRcbe = idRcbe; }

    public Double getVl() { return vl; }
    public void setVl(Double vl) { this.vl = vl; }

    public String getDsTran() { return dsTran; }
    public void setDsTran(String dsTran) { this.dsTran = dsTran; }

    public LocalDate getDtRef() { return dtRef; }
    public void setDtRef(LocalDate dtRef) { this.dtRef = dtRef; }
}

