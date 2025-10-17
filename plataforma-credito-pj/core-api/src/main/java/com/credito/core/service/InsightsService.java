package com.credito.core.service;

import java.util.Map;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.credito.core.client.MlServiceClient;
import com.credito.core.model.dto.storytelling.ExplainResponseDto;
import com.credito.core.model.dto.storytelling.ImpactoResponseDto;
import com.credito.core.model.dto.storytelling.MetricsResponseDto;
import com.credito.core.model.dto.storytelling.SimuladorResponseDto;

@Service
public class InsightsService {

    private final MlServiceClient mlClient;

    public InsightsService(MlServiceClient mlClient) {
        this.mlClient = mlClient;
    }

    @Cacheable(value = "impacto", key = "{#limit, #janela}")
    public ImpactoResponseDto buscarImpacto(int limit, int janela) {
        return mlClient.obterImpacto(limit, janela);
    }

    @CacheEvict(value = "impacto", allEntries = true)
    public void limparCacheImpacto() {
        // Evicção explícita utilizada pelo controlador em chamadas com refresh
    }

    @Cacheable(value = "explain", key = "#clienteId")
    public ExplainResponseDto explicarCliente(String clienteId) {
        return mlClient.explicarCliente(normalizarId(clienteId));
    }

    @Cacheable(value = "metrics", key = "'snapshot'")
    public MetricsResponseDto obterMetricasCache() {
        return mlClient.obterMetricas(false);
    }

    @CacheEvict(value = "metrics", allEntries = true)
    public MetricsResponseDto atualizarMetricas() {
        return mlClient.obterMetricas(true);
    }

    public MetricsResponseDto obterMetricas(boolean refresh) {
        return refresh ? atualizarMetricas() : obterMetricasCache();
    }

    public SimuladorResponseDto simularCredito(Map<String, Object> parametros) {
        return mlClient.simularCredito(parametros);
    }

    private String normalizarId(String clienteId) {
        if (clienteId == null) {
            return "";
        }
        return clienteId.trim();
    }
}
