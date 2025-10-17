package com.credito.core.model.dto.storytelling;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ExplainMetadataDto(
        @JsonProperty("gerado_em") String geradoEm,
        @JsonProperty("threshold_sugerido") Double thresholdSugerido,
        @JsonProperty("versao_modelo") String versaoModelo,
        @JsonProperty("dt_financeiro") String dtFinanceiro,
        String fonte) {
}
