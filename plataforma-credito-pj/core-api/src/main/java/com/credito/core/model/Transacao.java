package com.credito.core.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "transacao")
public class Transacao {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private String id;

    private String idPgto;
    private String idRcbe;
    private Double vl;
    private String dsTran;
    private LocalDate dtRef;

    // Getters e Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getIdPgto() { return idPgto; }
    public void setIdPgto(String idPgto) { this.idPgto = idPgto; }

    public String getIdRcbe() { return idRcbe; }
    public void setIdRcbe(String idRcbe) { this.idRcbe = idRcbe; }

    public Double getVl() { return vl; }
    public void setVl(Double vl) { this.vl = vl; }

    public String getDsTran() { return dsTran; }
    public void setDsTran(String dsTran) { this.dsTran = dsTran; }

    public LocalDate getDtRef() { return dtRef; }
    public void setDtRef(LocalDate dtRef) { this.dtRef = dtRef; }
}

