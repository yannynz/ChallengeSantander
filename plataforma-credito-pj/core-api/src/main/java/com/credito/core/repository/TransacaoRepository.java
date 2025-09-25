package com.credito.core.repository;

import com.credito.core.model.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransacaoRepository extends JpaRepository<Transacao, String> {}

