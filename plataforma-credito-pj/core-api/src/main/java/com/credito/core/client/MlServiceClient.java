package com.credito.core.client;

import java.util.Map;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import com.credito.core.model.dto.storytelling.ExplainResponseDto;
import com.credito.core.model.dto.storytelling.ImpactoResponseDto;
import com.credito.core.model.dto.storytelling.MetricsResponseDto;
import com.credito.core.model.dto.storytelling.SimuladorResponseDto;

@FeignClient(name = "ml-service", url = "${ml.service.url:http://ml_service:8000}")
public interface MlServiceClient {

    @PostMapping("/ml/v1/forecast/arima")
    Map<String, Object> forecast(@RequestBody Map<String, Object> body);

    @PostMapping("/ml/v1/score")
    Map<String, Object> calcularScore(@RequestBody Map<String, Object> body);

    @PostMapping("/ml/v1/sna/centralidades")
    Map<String, Object> calcularCentralidades(@RequestBody Map<String, Object> body);

    @GetMapping("/ml/v1/macro/{serie}")
    Map<String, Object> consultarMacro(
            @PathVariable("serie") String serie,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "horizonte", required = false) Integer horizonte);

    @GetMapping("/api/impacto")
    ImpactoResponseDto obterImpacto(
            @RequestParam(name = "limit", defaultValue = "5") int limit,
            @RequestParam(name = "janela", defaultValue = "180") int janela);

    @GetMapping("/api/explain/{clienteId}")
    ExplainResponseDto explicarCliente(@PathVariable("clienteId") String clienteId);

    @GetMapping("/api/metrics")
    MetricsResponseDto obterMetricas(@RequestParam(name = "refresh", defaultValue = "false") boolean refresh);

    @PostMapping("/api/simulador")
    SimuladorResponseDto simularCredito(@RequestBody Map<String, Object> body);
}
