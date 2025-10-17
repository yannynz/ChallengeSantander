package com.credito.core.model.dto.storytelling;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GenericMetadataDto(
        @JsonProperty("atualizado_em") String atualizadoEm,
        String fonte,
        Integer amostra,
        @JsonProperty("janela_dias") Integer janelaDias) {
}
