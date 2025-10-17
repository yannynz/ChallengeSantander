package com.credito.core.model.dto.storytelling;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ImpactoResponseDto(
        List<ImpactoClienteDto> clientes,
        List<RedeInfluenciaDto> rede_influencia,
        String resumo,
        GenericMetadataDto metadados) {
}
