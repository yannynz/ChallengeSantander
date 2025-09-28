package com.credito.core;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "credito.decisao.seed-on-startup=false")
@SpringBootTest
class CoreApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
