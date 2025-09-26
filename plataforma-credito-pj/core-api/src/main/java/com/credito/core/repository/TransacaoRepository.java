package com.credito.core.repository;

import com.credito.core.model.Transacao;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransacaoRepository extends JpaRepository<Transacao, Long> {
    List<Transacao> findTop500ByIdPgtoOrIdRcbeOrderByDtRefDesc(String idPgto, String idRcbe);
}
