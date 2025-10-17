package com.credito.core.model.dto.storytelling;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ImpactoClienteDto(
        @JsonProperty("empresa_id") String empresaId,
        String nome,
        String segmento,
        BigDecimal score,
        @JsonProperty("limite_antes") BigDecimal limiteAntes,
        @JsonProperty("limite_depois") BigDecimal limiteDepois,
        BigDecimal variacao,
        String moeda,
        Boolean aprovacao,
        String modelo,
        @JsonProperty("versao_modelo") String versaoModelo,
        @JsonProperty("dt_decisao") String dtDecisao,
        @JsonProperty("dt_decisao_anterior") String dtDecisaoAnterior) {
}
