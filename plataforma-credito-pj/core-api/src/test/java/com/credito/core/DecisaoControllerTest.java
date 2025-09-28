package com.credito.core;

import com.credito.core.controller.DecisaoController;
import com.credito.core.model.DecisaoCredito;
import com.credito.core.model.Empresa;
import com.credito.core.repository.DecisaoCreditoRepository;
import com.credito.core.service.DecisaoService;
import com.credito.core.service.EmpresaResolverService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DecisaoController.class)
class DecisaoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DecisaoService decisaoService;

    @MockBean
    private DecisaoCreditoRepository decisaoRepo;

    @MockBean
    private EmpresaResolverService empresaResolver;

    @Test
    void shouldFilterByEmpresa() throws Exception {
        when(decisaoService.obterDecisaoAtualPorId("CNPJ_00001"))
                .thenReturn(build("CNPJ_00001", 0.92, LocalDateTime.now()));
        when(empresaResolver.resolve(anyString())).thenAnswer(invocation -> buildEmpresa(invocation.getArgument(0)));

        mockMvc.perform(get("/decisoes").param("empresaId", "CNPJ_00001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].empresaId").value("CNPJ_00001"));
    }

    @Test
    void shouldLimitAndSortWhenWithoutFilter() throws Exception {
        LocalDateTime base = LocalDateTime.now();
        DecisaoCredito older = build("CNPJ_00001", 0.50, base.minusDays(2));
        DecisaoCredito newer = build("CNPJ_00002", 0.90, base);
        when(decisaoRepo.findAll()).thenReturn(List.of(older, newer));
        when(decisaoService.obterDecisaoAtualPorId("CNPJ_00002")).thenReturn(newer);

        mockMvc.perform(get("/decisoes").param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].empresaId").value("CNPJ_00002"));
    }

    @Test
    void shouldGenerateDecisionWhenMissing() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        DecisaoCredito generated = build("CNPJ_00003", 0.80, now);

        when(decisaoService.obterDecisaoAtualPorId("CNPJ_00003"))
                .thenReturn(null, generated);
        when(decisaoService.decidir("CNPJ_00003")).thenReturn(null);
        when(empresaResolver.resolve("CNPJ_00003")).thenReturn(buildEmpresa("CNPJ_00003"));

        mockMvc.perform(get("/decisoes").param("empresaId", "CNPJ_00003"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].empresaId").value("CNPJ_00003"));

        verify(decisaoService, times(1)).decidir("CNPJ_00003");
    }

    @Test
    void shouldResolveCanonicalIdWhenQueryingWithCnpj() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        DecisaoCredito generated = build("CNPJ_00010", 0.80, now);

        when(empresaResolver.resolve("00000000000010")).thenReturn(buildEmpresa("CNPJ_00010"));
        when(decisaoService.obterDecisaoAtualPorId("CNPJ_00010"))
                .thenReturn(null, generated);
        when(decisaoService.decidir("CNPJ_00010")).thenReturn(null);

        mockMvc.perform(get("/decisoes").param("empresaId", "00000000000010"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].empresaId").value("CNPJ_00010"));

        verify(decisaoService).decidir("CNPJ_00010");
    }

    private DecisaoCredito build(String empresaId, double score, LocalDateTime dt) {
        DecisaoCredito ent = new DecisaoCredito();
        ent.setId(1L);
        ent.setEmpresaId(empresaId);
        ent.setScore(score);
        ent.setAprovacao(score >= 0.7);
        ent.setDtDecisao(dt);
        ent.setCriadoEm(dt);
        ent.setLimite(1000.0);
        ent.setMoeda("BRL");
        ent.setDecisao(ent.getAprovacao() ? "APROVADO" : "REPROVADO");
        ent.setMotivo("Teste");
        return ent;
    }

    private Empresa buildEmpresa(String empresaId) {
        Empresa empresa = new Empresa();
        empresa.setId(empresaId.toUpperCase());
        return empresa;
    }
}
