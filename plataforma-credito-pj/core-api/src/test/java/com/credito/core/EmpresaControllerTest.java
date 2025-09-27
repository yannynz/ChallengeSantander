package com.credito.core;

import com.credito.core.client.MlServiceClient;
import com.credito.core.controller.EmpresaController;
import com.credito.core.model.Empresa;
import com.credito.core.model.EmpresaFinanceiro;
import com.credito.core.repository.EmpresaFinanceiroRepository;
import com.credito.core.repository.EmpresaRepository;
import com.credito.core.repository.ScoreRiscoRepository;
import com.credito.core.repository.TransacaoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EmpresaController.class)
class EmpresaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EmpresaRepository empresaRepo;

    @MockBean
    private EmpresaFinanceiroRepository financeiroRepo;

    @MockBean
    private ScoreRiscoRepository scoreRepo;

    @MockBean
    private TransacaoRepository transacaoRepo;

    @MockBean
    private MlServiceClient mlClient;

    @Test
    void shouldReturnScoreWithHistory() throws Exception {
        Empresa empresa = new Empresa();
        empresa.setId("CNPJ_00001");
        empresa.setCnpj("00000000000001");
        empresa.setDtAbrt(LocalDate.of(2020, 1, 1));

        EmpresaFinanceiro jan = new EmpresaFinanceiro();
        jan.setEmpresaId("CNPJ_00001");
        jan.setDtRef(LocalDate.of(2025, 1, 31));
        jan.setVlFatu(90_000.0);
        jan.setVlSldo(-5_000.0);

        EmpresaFinanceiro fev = new EmpresaFinanceiro();
        fev.setEmpresaId("CNPJ_00001");
        fev.setDtRef(LocalDate.of(2025, 2, 28));
        fev.setVlFatu(100_000.0);
        fev.setVlSldo(10_000.0);

        when(empresaRepo.findById("CNPJ_00001")).thenReturn(Optional.of(empresa));
        when(financeiroRepo.findByEmpresaIdOrderByDtRefAsc("CNPJ_00001"))
                .thenReturn(List.of(jan, fev));

        Map<String, Object> respostaJan = new LinkedHashMap<>();
        respostaJan.put("score", 0.70);
        respostaJan.put("modelo", "RandomForest");
        respostaJan.put("versao", "1.0.0");

        Map<String, Object> respostaFev = new LinkedHashMap<>();
        respostaFev.put("score", 0.85);
        respostaFev.put("modelo", "RandomForest");
        respostaFev.put("versao", "1.0.0");

        when(mlClient.calcularScore(any())).thenReturn(respostaJan, respostaFev);

        mockMvc.perform(get("/empresas/CNPJ_00001/score"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(closeTo(0.85, 0.0001)))
                .andExpect(jsonPath("$.historico", hasSize(2)))
                .andExpect(jsonPath("$.historico[0]").value(closeTo(0.70, 0.0001)))
                .andExpect(jsonPath("$.historico[1]").value(closeTo(0.85, 0.0001)))
                .andExpect(jsonPath("$.historicoTimestamps", hasSize(2)));
    }
}
