package com.top;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "anonymous.voter.secret=0123456789abcdef0123456789abcdef")
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
