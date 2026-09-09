package com.top.poll;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollStatus;
import com.top.poll.dto.PollSummaryResponse;
import com.top.poll.repository.PollRepository;
import com.top.poll.service.PollService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.List;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.mockito.Mockito.*;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = {PollService.class, PollCacheTest.Config.class})
class PollCacheTest {
	@jakarta.annotation.Resource
	private PollService service;

	@jakarta.annotation.Resource
	private PollRepository repository;

	@jakarta.annotation.Resource
	private CacheManager cacheManager;

	@BeforeEach
	void clearCache() {
		clearInvocations(repository);
		cacheManager.getCache("popularPolls").clear();
	}

	@Test
	void usesDatabaseOnMissAndCacheOnHit() {
		when(repository.findAllByStatusOrderByCreatedAtDesc(PollStatus.OPEN)).thenReturn(List.<Poll>of());

		service.findOpenPolls();
		service.findOpenPolls();

		verify(repository, times(1)).findAllByStatusOrderByCreatedAtDesc(PollStatus.OPEN);
	}

	@Test
	@EnabledIfEnvironmentVariable(named = "REDIS_INTEGRATION_TEST", matches = "true")
	void storesPollListInRedis() {
		LettuceConnectionFactory connectionFactory = new LettuceConnectionFactory("localhost", 6379);
		connectionFactory.afterPropertiesSet();
		try {
			CacheManager redis = RedisCacheManager.create(connectionFactory);
			PollSummaryResponse poll = new PollSummaryResponse(1L, "오늘의 투표", "SINGLE", 1,
					PollStatus.OPEN, Instant.EPOCH, Instant.EPOCH.plusSeconds(60));

			redis.getCache("popularPolls").put("open", List.of(poll));

			assertEquals(List.of(poll), redis.getCache("popularPolls").get("open", List.class));
		} finally {
			connectionFactory.destroy();
		}
	}

	@Configuration
	@EnableCaching
	static class Config {
		@Bean
		PollRepository pollRepository() {
			return mock(PollRepository.class);
		}

		@Bean
		CacheManager cacheManager() {
			return new ConcurrentMapCacheManager("popularPolls");
		}
	}
}
