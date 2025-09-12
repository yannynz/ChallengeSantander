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

    public Map<String, Object> forecast(String serie, String from) {
        return mlClient.forecast(Map.of(
            "serie", new double[]{100, 110, 120, 130},
            "horizonte", 3
        ));
    }
}

