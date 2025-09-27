package com.credito.core.repository;

import com.credito.core.model.DecisaoCredito;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DecisaoCreditoRepository extends JpaRepository<DecisaoCredito, Long> {

    List<DecisaoCredito> findByEmpresaIdOrderByDtDecisaoDesc(String empresaId);
}
