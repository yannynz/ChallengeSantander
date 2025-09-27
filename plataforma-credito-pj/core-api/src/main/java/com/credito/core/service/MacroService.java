package com.credito.core.service;

import com.credito.core.client.MlServiceClient;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class MacroService {
    private final MlServiceClient mlClient;

    public MacroService(MlServiceClient mlClient) {
        this.mlClient = mlClient;
    }

    public Map<String, Object> consultar(String serie, String from, Integer horizonte) {
        String serieNormalizada = serie == null ? null : serie.trim().toLowerCase();
        String fromNormalizado = (from == null || from.isBlank()) ? null : from.trim();
        Integer horizonteNormalizado = (horizonte == null || horizonte <= 0) ? null : horizonte;

        return mlClient.consultarMacro(serieNormalizada, fromNormalizado, horizonteNormalizado);
    }
}
