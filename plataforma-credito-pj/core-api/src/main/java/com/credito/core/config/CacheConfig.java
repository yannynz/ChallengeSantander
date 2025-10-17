package com.credito.core.config;

import java.time.Duration;

import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("impacto", "metrics", "explain", "simulador");
        manager.setCaffeine(
                Caffeine.newBuilder()
                        .recordStats()
                        .expireAfterWrite(Duration.ofMinutes(5))
                        .maximumSize(200));
        return manager;
    }
}
