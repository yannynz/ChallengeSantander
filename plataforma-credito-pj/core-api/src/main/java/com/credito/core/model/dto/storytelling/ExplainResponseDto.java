package com.credito.core.model.dto.storytelling;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ExplainResponseDto(
        @JsonProperty("id_cliente") String idCliente,
        @JsonProperty("score_modelo") Double scoreModelo,
        @JsonProperty("nivel_risco") String nivelRisco,
        Map<String, Double> fatores,
        String modelo,
        List<String> observacoes,
        ExplainMetadataDto metadados) {
}
