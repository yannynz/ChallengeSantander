package com.credito.core.model.dto.storytelling;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HistoricoAucDto(
        String periodo,
        Double auc) {
}
