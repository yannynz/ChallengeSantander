package com.credito.core.controller;

import com.credito.core.client.MlServiceClient;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/macro")
public class MacroController {

    private final MlServiceClient mlClient;

    public MacroController(MlServiceClient mlClient) {
        this.mlClient = mlClient;
    }

    @GetMapping
    public Map<String, Object> forecast(@RequestParam String serie, @RequestParam String from) {
        return mlClient.forecast(Map.of(
            "serie", new double[]{100, 110, 120, 130},
            "horizonte", 3
        ));
    }
}

