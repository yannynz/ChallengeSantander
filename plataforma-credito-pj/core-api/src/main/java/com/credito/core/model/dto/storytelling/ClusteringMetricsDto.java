package com.credito.core.model.dto.storytelling;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ClusteringMetricsDto(
        @JsonProperty("Silhouette") Double silhouette,
        @JsonProperty("Calinski") Double calinski,
        Integer clusters,
        Integer amostra,
        @JsonProperty("media_faturamento") Double mediaFaturamento,
        @JsonProperty("media_saldo") Double mediaSaldo) {
}
