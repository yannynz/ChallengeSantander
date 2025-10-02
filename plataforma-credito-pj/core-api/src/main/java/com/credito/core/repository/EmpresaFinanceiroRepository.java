// src/main/java/com/credito/core/repository/EmpresaFinanceiroRepository.java
package com.credito.core.repository;

import com.credito.core.model.EmpresaFinanceiro;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EmpresaFinanceiroRepository extends JpaRepository<EmpresaFinanceiro, Long> {
    Optional<EmpresaFinanceiro> findTopByEmpresaIdOrderByDtRefDesc(String empresaId);
    List<EmpresaFinanceiro> findByEmpresaIdOrderByDtRefAsc(String empresaId);
}
