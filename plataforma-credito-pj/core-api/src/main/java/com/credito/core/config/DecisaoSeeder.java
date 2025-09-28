package com.credito.core.config;

import com.credito.core.repository.EmpresaRepository;
import com.credito.core.service.DecisaoService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class DecisaoSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DecisaoSeeder.class);

    private final boolean seedOnStartup;
    private final EmpresaRepository empresaRepository;
    private final DecisaoService decisaoService;

    public DecisaoSeeder(
            @Value("${credito.decisao.seed-on-startup:false}") boolean seedOnStartup,
            EmpresaRepository empresaRepository,
            DecisaoService decisaoService) {
        this.seedOnStartup = seedOnStartup;
        this.empresaRepository = empresaRepository;
        this.decisaoService = decisaoService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!seedOnStartup) {
            return;
        }

        List<String> pendentes = empresaRepository.findIdsWithoutDecisao();
        if (pendentes.isEmpty()) {
            log.info("Todas as empresas já possuem decisão registrada.");
            return;
        }

        log.info("Gerando decisões iniciais para {} empresas.", pendentes.size());

        int sucesso = 0;
        for (String empresaId : pendentes) {
            try {
                decisaoService.decidir(empresaId);
                sucesso++;
            } catch (Exception ex) {
                log.warn("Falha ao gerar decisão para {}: {}", empresaId, ex.getMessage());
            }
        }

        log.info("Seed de decisões concluída. Sucesso: {} / {} empresas.", sucesso, pendentes.size());
    }
}
