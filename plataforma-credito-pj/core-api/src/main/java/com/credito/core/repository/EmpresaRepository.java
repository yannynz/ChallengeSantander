package com.credito.core.repository;

import com.credito.core.model.Empresa;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EmpresaRepository extends JpaRepository<Empresa, String> {
    Optional<Empresa> findByCnpj(String cnpj);

    @Query("SELECT e.id FROM Empresa e WHERE NOT EXISTS (SELECT 1 FROM DecisaoCredito d WHERE d.empresaId = e.id)")
    List<String> findIdsWithoutDecisao();
}
