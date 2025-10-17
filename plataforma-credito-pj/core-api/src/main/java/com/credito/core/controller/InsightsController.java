package com.credito.core.controller;

import java.util.Map;
import java.util.function.Supplier;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.credito.core.model.dto.storytelling.ExplainResponseDto;
import com.credito.core.model.dto.storytelling.ImpactoResponseDto;
import com.credito.core.model.dto.storytelling.MetricsResponseDto;
import com.credito.core.model.dto.storytelling.SimuladorResponseDto;
import com.credito.core.service.InsightsService;

import feign.FeignException;

@RestController
@RequestMapping("/api")
public class InsightsController {

    private final InsightsService insightsService;

    public InsightsController(InsightsService insightsService) {
        this.insightsService = insightsService;
    }

    @GetMapping("/impacto")
    public ImpactoResponseDto impacto(
            @RequestParam(name = "limit", defaultValue = "5") int limit,
            @RequestParam(name = "janela", defaultValue = "180") int janela,
            @RequestParam(name = "refresh", defaultValue = "false") boolean refresh) {
        if (refresh) {
            insightsService.limparCacheImpacto();
        }
        return executar(() -> insightsService.buscarImpacto(limit, janela));
    }

    @GetMapping("/explain/{clienteId}")
    public ExplainResponseDto explicar(@PathVariable("clienteId") String clienteId) {
        return executar(() -> insightsService.explicarCliente(clienteId));
    }

    @GetMapping("/metrics")
    public MetricsResponseDto metricas(
            @RequestParam(name = "refresh", defaultValue = "false") boolean refresh) {
        return executar(() -> insightsService.obterMetricas(refresh));
    }

    @PostMapping("/simulador")
    public SimuladorResponseDto simular(@RequestBody Map<String, Object> parametros) {
        return executar(() -> insightsService.simularCredito(parametros));
    }

    private <T> T executar(Supplier<T> supplier) {
        try {
            return supplier.get();
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (FeignException feignEx) {
            HttpStatus status = HttpStatus.resolve(feignEx.status());
            if (status != null && status.is4xxClientError()) {
                throw new ResponseStatusException(status, feignEx.getMessage(), feignEx);
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Falha ao consultar ml-service", feignEx);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), ex);
        }
    }
}
