package com.credito.core.model.dto.storytelling;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MetricsResponseDto(
        ClassificationMetricsDto classificacao,
        ClusteringMetricsDto clusterizacao,
        @JsonProperty("historico_auc") List<HistoricoAucDto> historicoAuc,
        @JsonProperty("atualizado_em") String atualizadoEm,
        String fonte,
        @JsonProperty("janela_dias") Integer janelaDias,
        @JsonProperty("drift_psi") Double driftPsi) {
}
