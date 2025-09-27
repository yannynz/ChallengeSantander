package com.credito.core.controller;

import com.credito.core.service.MacroService;
import feign.FeignException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/macro")
public class MacroController {

    private final MacroService macroService;

    public MacroController(MacroService macroService) {
        this.macroService = macroService;
    }

    @GetMapping
    public Map<String, Object> consultar(
            @RequestParam(name = "serie", required = false) List<String> series,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "horizonte", required = false) Integer horizonte
    ) {
        LinkedHashSet<String> sanitized = new LinkedHashSet<>();
        if (series != null) {
            for (String raw : series) {
                if (raw == null) {
                    continue;
                }
                for (String part : raw.split(",")) {
                    String trimmed = part.trim();
                    if (!trimmed.isEmpty()) {
                        sanitized.add(trimmed);
                    }
                }
            }
        }

        if (sanitized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parametro 'serie' é obrigatório.");
        }

        List<String> orderedSeries = new ArrayList<>(sanitized);

        try {
            if (orderedSeries.size() == 1) {
                return macroService.consultar(orderedSeries.get(0), from, horizonte);
            }

            List<Map<String, Object>> results = new ArrayList<>();
            for (String item : orderedSeries) {
                Map<String, Object> resultado = macroService.consultar(item, from, horizonte);
                LinkedHashMap<String, Object> enriched = new LinkedHashMap<>(resultado);
                enriched.putIfAbsent("serieId", item.trim().toLowerCase());
                enriched.put("requestedSerie", item);
                results.add(enriched);
            }

            LinkedHashMap<String, Object> payload = new LinkedHashMap<>();
            payload.put("series", results);
            payload.put("requested", orderedSeries);
            payload.put("count", results.size());
            return payload;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (FeignException feignEx) {
            HttpStatus status = HttpStatus.resolve(feignEx.status());
            if (status != null && status.is4xxClientError()) {
                throw new ResponseStatusException(status, feignEx.getMessage(), feignEx);
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, feignEx.getMessage(), feignEx);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, ex.getMessage(), ex);
        }
    }
}
