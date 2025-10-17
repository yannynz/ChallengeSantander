package com.credito.core;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.credito.core.controller.InsightsController;
import com.credito.core.model.dto.storytelling.ExplainMetadataDto;
import com.credito.core.model.dto.storytelling.ExplainResponseDto;
import com.credito.core.model.dto.storytelling.GenericMetadataDto;
import com.credito.core.model.dto.storytelling.ImpactoClienteDto;
import com.credito.core.model.dto.storytelling.ImpactoResponseDto;
import com.credito.core.model.dto.storytelling.MetricsResponseDto;
import com.credito.core.model.dto.storytelling.SimuladorResponseDto;
import com.credito.core.model.dto.storytelling.ClassificationMetricsDto;
import com.credito.core.model.dto.storytelling.ClusteringMetricsDto;
import com.credito.core.service.InsightsService;

import java.math.BigDecimal;
import java.util.List;

@WebMvcTest(InsightsController.class)
class InsightsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InsightsService insightsService;

    @Test
    void shouldReturnImpactoPayload() throws Exception {
        ImpactoResponseDto payload = new ImpactoResponseDto(
                List.of(new ImpactoClienteDto(
                        "CLI001",
                        "CLI001",
                        "Seg",
                        BigDecimal.valueOf(0.92),
                        BigDecimal.valueOf(5000),
                        BigDecimal.valueOf(8000),
                        BigDecimal.valueOf(3000),
                        "BRL",
                        Boolean.TRUE,
                        "rf",
                        "rf-1",
                        "2024-05-01T00:00:00Z",
                        null)),
                List.of(),
                "Resumo",
                new GenericMetadataDto("2024-05-01T00:00:00Z", "fonte", 1, 180));

        when(insightsService.buscarImpacto(eq(5), eq(180))).thenReturn(payload);

        mockMvc.perform(get("/api/impacto"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientes[0].empresa_id").value("CLI001"));
    }

    @Test
    void shouldReturnExplainResponse() throws Exception {
        ExplainResponseDto dto = new ExplainResponseDto(
                "CLI001",
                0.81,
                "baixo",
                java.util.Map.of("vl_fatu", 0.12),
                "rf",
                List.of("obs"),
                new ExplainMetadataDto("2024-05-01T00:00:00Z", 0.55, "rf-1", null, "fonte"));

        when(insightsService.explicarCliente(eq("CLI001"))).thenReturn(dto);

        mockMvc.perform(get("/api/explain/CLI001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id_cliente").value("CLI001"))
                .andExpect(jsonPath("$.nivel_risco").value("baixo"));
    }

    @Test
    void shouldReturnMetrics() throws Exception {
        MetricsResponseDto metrics = new MetricsResponseDto(
                new ClassificationMetricsDto(0.8, 0.7, 0.75, 0.72, 0.55, 10),
                new ClusteringMetricsDto(0.6, 340.0, 3, 10, 10000.0, 5000.0),
                List.of(),
                "2024-05-01T00:00:00Z",
                "fonte",
                180,
                0.02);
        when(insightsService.obterMetricas(false)).thenReturn(metrics);

        mockMvc.perform(get("/api/metrics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.classificacao.AUC").value(0.8));
    }

    @Test
    void shouldReturnSimuladorResult() throws Exception {
        SimuladorResponseDto resposta = new SimuladorResponseDto(
                0.83,
                "baixo",
                "rf",
                0.5,
                12000.0,
                "ok",
                new GenericMetadataDto("2024-05-01T00:00:00Z", "fonte", null, null));
        when(insightsService.simularCredito(anyMap())).thenReturn(resposta);

        mockMvc.perform(post("/api/simulador")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"renda\": 8000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(0.83))
                .andExpect(jsonPath("$.risco").value("baixo"));
    }
}
