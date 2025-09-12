package com.credito.core.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "ml-service", url = "${ml.service.url:http://ml_service:8000}")
public interface MlServiceClient {

    @PostMapping("/ml/v1/forecast/arima")
    Map<String, Object> forecast(@RequestBody Map<String, Object> body);

    @PostMapping("/ml/v1/score")
    Map<String, Object> calcularScore(@RequestBody Map<String, Object> body);

    @PostMapping("/ml/v1/sna/centralidades")
    Map<String, Object> calcularCentralidades(@RequestBody Map<String, Object> body);
}
