package com.credito.core.model.dto.storytelling;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RedeInfluenciaDto(
        String cliente,
        BigDecimal influencia,
        BigDecimal grau,
        BigDecimal betweenness,
        @JsonProperty("dt_calc") String dtCalc) {
}
