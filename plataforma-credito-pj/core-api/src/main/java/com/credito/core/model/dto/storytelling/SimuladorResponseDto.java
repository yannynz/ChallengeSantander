package com.credito.core.model.dto.storytelling;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SimuladorResponseDto(
        Double score,
        String risco,
        String modelo,
        @JsonProperty("influencia_rede") Double influenciaRede,
        @JsonProperty("limite_sugerido") Double limiteSugerido,
        String mensagem,
        GenericMetadataDto metadados) {
}
