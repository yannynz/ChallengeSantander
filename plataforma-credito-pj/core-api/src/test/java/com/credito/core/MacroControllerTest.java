package com.credito.core;

import com.credito.core.controller.MacroController;
import com.credito.core.service.MacroService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MacroController.class)
class MacroControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MacroService macroService;

    @Test
    void shouldReturnSingleSeriePayload() throws Exception {
        Map<String, Object> payload = Map.of("serieId", "selic", "serie", new double[]{});
        when(macroService.consultar(eq("selic"), eq("2024-01"), eq(6))).thenReturn(payload);

        mockMvc.perform(get("/macro")
                        .param("serie", "selic")
                        .param("from", "2024-01")
                        .param("horizonte", "6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serieId").value("selic"));
    }

    @Test
    void shouldAggregateMultipleSeries() throws Exception {
        Map<String, Object> selic = Map.of("serieId", "selic");
        Map<String, Object> ipca = Map.of("serieId", "ipca");

        when(macroService.consultar(eq("selic"), eq(null), eq(null))).thenReturn(selic);
        when(macroService.consultar(eq("ipca"), eq(null), eq(null))).thenReturn(ipca);

        mockMvc.perform(get("/macro")
                        .param("serie", "selic")
                        .param("serie", "ipca"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.series").isArray())
                .andExpect(jsonPath("$.series[0].serieId").value("selic"))
                .andExpect(jsonPath("$.series[1].serieId").value("ipca"))
                .andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.requested[0]").value("selic"))
                .andExpect(jsonPath("$.requested[1]").value("ipca"));
    }

    @Test
    void shouldRejectMissingSeries() throws Exception {
        mockMvc.perform(get("/macro"))
                .andExpect(status().isBadRequest());
    }
}
