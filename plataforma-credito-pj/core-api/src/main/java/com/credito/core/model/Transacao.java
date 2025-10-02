package com.credito.core.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "transacao")
public class Transacao {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_pgto")
    private String idPgto;

    @Column(name = "id_rcbe")
    private String idRcbe;

    @Column(name = "vl")
    private Double vl;

    @Column(name = "ds_tran")
    private String dsTran;

    @Column(name = "dt_ref")
    private LocalDate dtRef;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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
