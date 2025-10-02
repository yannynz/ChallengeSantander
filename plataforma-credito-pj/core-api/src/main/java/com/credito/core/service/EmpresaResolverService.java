package com.credito.core.service;

import com.credito.core.model.Empresa;
import com.credito.core.repository.EmpresaRepository;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EmpresaResolverService {

    private final EmpresaRepository empresaRepo;

    public EmpresaResolverService(EmpresaRepository empresaRepo) {
        this.empresaRepo = empresaRepo;
    }

    /**
     * Resolve um identificador flexível (ID canônico, CNPJ puro, CNPJ mascarado ou sufixo) e retorna
     * a entidade {@link Empresa} correspondente.
     */
    public Empresa resolve(String identifier) {
        String trimmed = Optional.ofNullable(identifier).map(String::trim).orElse("");
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador da empresa vazio.");
        }

        String upper = trimmed.toUpperCase(Locale.ROOT);

        Optional<Empresa> resolved = empresaRepo.findById(upper)
                .or(() -> empresaRepo.findByCnpj(trimmed))
                .or(() -> empresaRepo.findByCnpj(upper));
        if (resolved.isPresent()) {
            return resolved.get();
        }

        String digits = digitsOnly(trimmed);
        if (!digits.isEmpty()) {
            String cnpj14 = leftPadDigits(digits, 14);
            resolved = empresaRepo.findByCnpj(cnpj14);
            if (resolved.isPresent()) {
                return resolved.get();
            }

            String lastFive = digits.length() > 5 ? digits.substring(digits.length() - 5) : digits;
            String candidateId = "CNPJ_" + leftPadDigits(lastFive, 5);
            resolved = empresaRepo.findById(candidateId.toUpperCase(Locale.ROOT));
            if (resolved.isPresent()) {
                return resolved.get();
            }
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada: " + identifier);
    }

    /** Retorna apenas o ID canônico da empresa associado ao identificador informado. */
    public String resolveId(String identifier) {
        return resolve(identifier).getId();
    }

    private static String digitsOnly(String value) {
        StringBuilder builder = new StringBuilder(value.length());
        for (char ch : value.toCharArray()) {
            if (Character.isDigit(ch)) {
                builder.append(ch);
            }
        }
        return builder.toString();
    }

    private static String leftPadDigits(String digits, int targetLength) {
        if (digits.length() >= targetLength) {
            return digits.substring(digits.length() - targetLength);
        }
        StringBuilder builder = new StringBuilder(targetLength);
        builder.append("0".repeat(targetLength - digits.length()));
        builder.append(digits);
        return builder.toString();
    }
}

