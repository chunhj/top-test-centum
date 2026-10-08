package com.top.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Serves the React build (copied into classpath:/static at image build time) and falls back to
 * index.html for client-side routes such as /polls/3, so a browser refresh does not 404.
 * API and actuator paths never fall back; they keep their normal 404 behaviour.
 */
@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/**")
				.addResourceLocations("classpath:/static/")
				.resourceChain(true)
				.addResolver(new SpaFallbackResolver());
	}

	private static final class SpaFallbackResolver extends PathResourceResolver {
		@Override
		protected Resource getResource(String resourcePath, Resource location) throws IOException {
			if (!resourcePath.isEmpty()) {
				Resource requested = location.createRelative(resourcePath);
				if (requested.exists() && requested.isReadable()) {
					return requested;
				}
			}
			if (resourcePath.startsWith("api/") || resourcePath.startsWith("actuator/")) {
				return null;
			}
			Resource index = location.createRelative("index.html");
			return index.exists() && index.isReadable() ? index : null;
		}
	}
}
