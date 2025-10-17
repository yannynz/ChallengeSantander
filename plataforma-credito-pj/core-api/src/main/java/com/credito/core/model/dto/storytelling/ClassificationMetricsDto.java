package com.credito.core.model.dto.storytelling;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ClassificationMetricsDto(
        @JsonProperty("AUC") Double auc,
        @JsonProperty("F1") Double f1,
        @JsonProperty("Recall") Double recall,
        @JsonProperty("Precision") Double precision,
        @JsonProperty("threshold_utilizado") Double thresholdUtilizado,
        Integer amostra) {
}
