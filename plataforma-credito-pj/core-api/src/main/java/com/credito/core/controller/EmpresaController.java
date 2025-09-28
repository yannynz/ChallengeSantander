package com.credito.core.controller;

import com.credito.core.client.MlServiceClient;
import com.credito.core.model.Empresa;
import com.credito.core.model.EmpresaFinanceiro;
import com.credito.core.model.ScoreRisco;
import com.credito.core.model.Transacao;
import com.credito.core.repository.EmpresaFinanceiroRepository;
import com.credito.core.repository.EmpresaRepository;
import com.credito.core.repository.ScoreRiscoRepository;
import com.credito.core.repository.TransacaoRepository;
import com.credito.core.service.EmpresaResolverService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/empresas")
public class EmpresaController {

    private static final Logger log = LoggerFactory.getLogger(EmpresaController.class);

    private final EmpresaRepository empresaRepo;
    private final EmpresaFinanceiroRepository financeiroRepo;
    private final TransacaoRepository transacaoRepo;
    private final MlServiceClient mlClient;
    private final ScoreRiscoRepository scoreRiscoRepo;
    private final EmpresaResolverService empresaResolver;

    public EmpresaController(
            EmpresaRepository empresaRepo,
            EmpresaFinanceiroRepository financeiroRepo,
            TransacaoRepository transacaoRepo,
            MlServiceClient mlClient,
            ScoreRiscoRepository scoreRiscoRepo,
            EmpresaResolverService empresaResolver) {
        this.empresaRepo = empresaRepo;
        this.financeiroRepo = financeiroRepo;
        this.transacaoRepo = transacaoRepo;
        this.mlClient = mlClient;
        this.scoreRiscoRepo = scoreRiscoRepo;
        this.empresaResolver = empresaResolver;
    }

    @GetMapping
    public List<Empresa> listarEmpresas() {
        return empresaRepo.findAll();
    }

    @GetMapping("/{identifier}")
    public Empresa getEmpresa(@PathVariable String identifier) {
        return empresaResolver.resolve(identifier);
    }

    @GetMapping("/{identifier}/score")
    public Map<String, Object> getScore(@PathVariable String identifier) {
        Empresa empresa = empresaResolver.resolve(identifier);
        log.info("[SCORE] Resolvendo score para identifier={} -> empresaId={} cnpj={}",
                identifier, empresa.getId(), empresa.getCnpj());

        List<EmpresaFinanceiro> historicoFinanceiro = financeiroRepo
                .findByEmpresaIdOrderByDtRefAsc(empresa.getId());

        log.info("[SCORE] Registros financeiros encontrados para {}: {}", empresa.getId(),
                historicoFinanceiro.size());

        if (historicoFinanceiro.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Nenhum dado financeiro encontrado para a empresa " + empresa.getId());
        }

        List<Double> historicoValores = new ArrayList<>();
        List<String> historicoInstantes = new ArrayList<>();

        Map<String, Object> ultimoFeatures = null;
        Map<String, Object> ultimoMlResponse = null;
        LocalDateTime ultimaData = null;

        int indice = 0;
        for (EmpresaFinanceiro registro : historicoFinanceiro) {
            indice++;
            Map<String, Object> featuresRegistro = buildFeaturesParaPeriodo(
                    empresa,
                    registro
            );

            log.debug("[SCORE] Features periodo#{} para {} -> {}", indice, empresa.getId(),
                    featuresRegistro);

            Map<String, Object> mlResponse = mlClient.calcularScore(Map.of(
                    "features", featuresRegistro,
                    "modelo", "rf"
            ));

            double valor = toDouble(mlResponse.get("score"));
            if (!Double.isFinite(valor)) {
                log.warn("[SCORE] ML retornou score não numérico para {} no periodo#{}: {}", 
                        empresa.getId(), indice, mlResponse.get("score"));
            }

            log.debug("[SCORE] Resposta ML periodo#{} para {} -> {}", indice, empresa.getId(),
                    mlResponse);
            LocalDateTime referencia = Optional.ofNullable(registro.getDtRef())
                    .map(data -> data.atStartOfDay())
                    .orElse(LocalDateTime.now());

            historicoValores.add(valor);
            historicoInstantes.add(referencia.toString());

            ultimoFeatures = featuresRegistro;
            ultimoMlResponse = mlResponse;
            ultimaData = referencia;
        }

        if (ultimoMlResponse == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Falha ao calcular score.");
        }

        double ultimoScore = toDouble(ultimoMlResponse.get("score"));
        log.info("[SCORE] Score final calculado para {} = {} (modelo={}, versao={})",
                empresa.getId(), ultimoScore,
                ultimoMlResponse.getOrDefault("modelo", "rf"),
                ultimoMlResponse.getOrDefault("versao", "desconhecida"));

        ScoreRisco score = new ScoreRisco();
        score.setEmpresaId(empresa.getId());
        score.setScore(ultimoScore);
        score.setModelo(asString(ultimoMlResponse.get("modelo"), "rf"));
        score.setVersao(asString(ultimoMlResponse.get("versao"), null));
        score.setDtCalc(Optional.ofNullable(ultimaData).orElse(LocalDateTime.now()));
        scoreRiscoRepo.save(score);

        log.info("[SCORE] Score persistido para {} em {} (modelo={}, versao={})",
                empresa.getId(), score.getDtCalc(), score.getModelo(), score.getVersao());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("empresaId", empresa.getId());
        response.put("cnpj", empresa.getCnpj());
        response.put("features", ultimoFeatures);
        response.putAll(ultimoMlResponse);
        response.put("historico", historicoValores);
        response.put("historicoTimestamps", historicoInstantes);
        response.put("ultimaAtualizacaoScore", ultimaData);

        return response;
    }

    @GetMapping("/{identifier}/rede")
    public Map<String, Object> getRede(@PathVariable String identifier) {
        Empresa empresa = empresaResolver.resolve(identifier);
        List<Transacao> transacoes = transacaoRepo
                .findTop500ByIdPgtoOrIdRcbeOrderByDtRefDesc(empresa.getId(), empresa.getId());

        Map<String, Double> pesos = agruparTransacoes(transacoes);
        if (pesos.isEmpty()) {
            Map<String, Object> vazio = new LinkedHashMap<>();
            vazio.put("empresaId", empresa.getId());
            vazio.put("cnpj", empresa.getCnpj());
            vazio.put("nodes", List.of(Map.of("id", empresa.getId(), "label", empresa.getId())));
            vazio.put("edges", List.of());
            return vazio;
        }

        List<Map<String, Object>> edges = montarEdgesOrdenados(pesos);
        Set<String> nodeIds = coletarNodes(edges, empresa.getId());

        Map<String, Object> centralidades = calcularCentralidades(edges);
        Map<String, Double> grau = extractCentralidade(centralidades, "grau");
        Map<String, Double> betweenness = extractCentralidade(centralidades, "betweenness");
        Map<String, Double> eigenvector = extractCentralidade(centralidades, "eigenvector");
        Map<String, Integer> clusters = extractClusters(centralidades);

        List<Map<String, Object>> nodes = new ArrayList<>();
        for (String nodeId : nodeIds) {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("id", nodeId);
            node.put("label", nodeId);
            Double grauValue = grau.get(nodeId);
            if (grauValue != null) {
                node.put("value", grauValue);
            }
            Double betweenValue = betweenness.get(nodeId);
            if (betweenValue != null) {
                node.put("betweenness", betweenValue);
            }
            Double eigenValue = eigenvector.get(nodeId);
            if (eigenValue != null) {
                node.put("eigenvector", eigenValue);
            }
            Integer cluster = clusters.get(nodeId);
            if (cluster != null) {
                node.put("cluster", cluster);
            }
            if (nodeId.equals(empresa.getId())) {
                node.put("highlight", true);
            }
            nodes.add(node);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("empresaId", empresa.getId());
        response.put("cnpj", empresa.getCnpj());
        response.put("nodes", nodes);
        response.put("edges", edges);
        if (!centralidades.isEmpty()) {
            response.put("centralidades", centralidades);
        }
        return response;
    }

    private static Map<String, Object> buildFeaturesParaPeriodo(Empresa empresa, EmpresaFinanceiro registro) {
        int idadeNoPeriodo = calcularIdadeNoPeriodo(empresa.getDtAbrt(), registro.getDtRef());
        double faturamento = Optional.ofNullable(registro.getVlFatu()).orElse(0.0d);
        double saldo = Optional.ofNullable(registro.getVlSldo()).orElse(0.0d);

        return Map.of(
                "idade", idadeNoPeriodo,
                "vl_fatu", faturamento,
                "vl_sldo", saldo
        );
    }

    private static int calcularIdadeNoPeriodo(LocalDate abertura, LocalDate referencia) {
        LocalDate baseReferencia = Optional.ofNullable(referencia).orElse(LocalDate.now());
        if (abertura == null) {
            return 0;
        }
        return Math.max(0, Period.between(abertura, baseReferencia).getYears());
    }

    private static Map<String, Double> agruparTransacoes(List<Transacao> transacoes) {
        if (transacoes == null || transacoes.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, Double> agregados = new LinkedHashMap<>();
        for (Transacao transacao : transacoes) {
            if (transacao.getIdPgto() == null || transacao.getIdRcbe() == null) {
                continue;
            }
            double valor = Optional.ofNullable(transacao.getVl()).orElse(0.0d);
            if (valor == 0.0d) {
                continue;
            }
            String chave = transacao.getIdPgto() + "->" + transacao.getIdRcbe();
            agregados.merge(chave, valor, Double::sum);
        }
        return agregados;
    }

    private static List<Map<String, Object>> montarEdgesOrdenados(Map<String, Double> pesos) {
        List<Map.Entry<String, Double>> entradas = new ArrayList<>(pesos.entrySet());
        entradas.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

        List<Map<String, Object>> edges = new ArrayList<>();
        int counter = 0;
        for (Map.Entry<String, Double> entry : entradas) {
            if (entry.getValue() == null || entry.getValue() == 0.0d) {
                continue;
            }
            String[] partes = entry.getKey().split("->", 2);
            if (partes.length != 2) {
                continue;
            }
            Map<String, Object> edge = new LinkedHashMap<>();
            edge.put("id", ++counter);
            edge.put("from", partes[0]);
            edge.put("to", partes[1]);
            edge.put("value", entry.getValue());
            edges.add(edge);
            if (edges.size() >= 200) {
                break;
            }
        }
        return edges;
    }

    private static Set<String> coletarNodes(List<Map<String, Object>> edges, String empresaId) {
        Set<String> nodeIds = new LinkedHashSet<>();
        nodeIds.add(empresaId);
        for (Map<String, Object> edge : edges) {
            Object from = edge.get("from");
            Object to = edge.get("to");
            if (from instanceof String fromId) {
                nodeIds.add(fromId);
            }
            if (to instanceof String toId) {
                nodeIds.add(toId);
            }
        }
        return nodeIds;
    }

    private Map<String, Object> calcularCentralidades(List<Map<String, Object>> edges) {
        if (edges.isEmpty()) {
            return Collections.emptyMap();
        }
        try {
            List<Map<String, Object>> payloadEdges = new ArrayList<>(edges.size());
            for (Map<String, Object> edge : edges) {
                Object value = edge.get("value");
                double peso = value instanceof Number ? ((Number) value).doubleValue() : 0.0d;
                payloadEdges.add(Map.of(
                        "source", edge.get("from"),
                        "target", edge.get("to"),
                        "weight", peso
                ));
            }
            return mlClient.calcularCentralidades(Map.of("edges", payloadEdges));
        } catch (Exception ex) {
            log.warn("Falha ao calcular centralidades: {}", ex.getMessage());
            return Collections.emptyMap();
        }
    }

    private static Map<String, Double> extractCentralidade(Map<String, Object> centralidades, String chave) {
        if (centralidades == null || centralidades.isEmpty()) {
            return Collections.emptyMap();
        }
        Object valor = centralidades.get(chave);
        if (!(valor instanceof Map<?, ?> mapa)) {
            return Collections.emptyMap();
        }
        Map<String, Double> resultado = new LinkedHashMap<>();
        mapa.forEach((k, v) -> {
            if (k != null && v instanceof Number numero) {
                resultado.put(String.valueOf(k), numero.doubleValue());
            }
        });
        return resultado;
    }

    private static Map<String, Integer> extractClusters(Map<String, Object> centralidades) {
        if (centralidades == null || centralidades.isEmpty()) {
            return Collections.emptyMap();
        }
        Object valor = centralidades.get("clusters");
        if (!(valor instanceof Map<?, ?> mapa)) {
            return Collections.emptyMap();
        }
        Map<String, Integer> resultado = new LinkedHashMap<>();
        mapa.forEach((k, v) -> {
            if (k != null) {
                int cluster = 0;
                if (v instanceof Number numero) {
                    cluster = numero.intValue();
                } else {
                    try {
                        cluster = Integer.parseInt(String.valueOf(v));
                    } catch (NumberFormatException ignored) {
                        // ignora valores inválidos
                    }
                }
                resultado.put(String.valueOf(k), cluster);
            }
        });
        return resultado;
    }

    private static double toDouble(Object value) {
        if (value instanceof Number numero) {
            return numero.doubleValue();
        }
        if (value instanceof String texto) {
            try {
                return Double.parseDouble(texto);
            } catch (NumberFormatException ignored) {
                return 0.0d;
            }
        }
        return 0.0d;
    }

    private static String asString(Object value, String defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        String texto = String.valueOf(value).trim();
        return texto.isEmpty() ? defaultValue : texto;
    }

}
