package com.credito.core.model.dto;

import java.time.LocalDateTime;

public record DecisaoResponse(
        Long id,
        String empresaId,
        LocalDateTime dtDecisao,
        Double score,
        Boolean aprovacao,
        Double limite,
        String moeda,
        String motivo,
        String decisao
) {}
