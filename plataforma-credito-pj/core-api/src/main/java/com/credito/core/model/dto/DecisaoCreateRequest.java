package com.credito.core.model.dto; 

import jakarta.validation.constraints.NotBlank;

public record DecisaoCreateRequest(
        @NotBlank String empresaId
) {}

