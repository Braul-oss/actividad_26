package mx.edu.utvt.reportes.config;

import mx.edu.utvt.reportes.seguridad.JwtFilter;
import mx.edu.utvt.reportes.seguridad.JwtService;
import mx.edu.utvt.reportes.seguridad.LimiteSolicitudesFilter;
import mx.edu.utvt.reportes.seguridad.RespuestaJson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {
    private static final Logger bitacora = LoggerFactory.getLogger("BITACORA_SEGURIDAD");

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SecurityFilterChain filtros(HttpSecurity http, JwtService jwt,
                                @Value("${app.limite.solicitudes-por-minuto}") int limite) throws Exception {
        http
            // API sin estado con token Bearer: no usa cookies de sesión, por lo que CSRF no aplica.
            .csrf(AbstractHttpConfigurer::disable)
            .cors(c -> { })
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .headers(h -> h
                .frameOptions(f -> f.deny())
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; img-src 'self'; frame-ancestors 'none'")))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/refresh").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/salud").permitAll()
                // Las fotos se protegen con una firma temporal en la URL (ver UrlFirmadaService)
                .requestMatchers(HttpMethod.GET, "/api/evidencias/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/reportes").hasAnyRole("ESTUDIANTE", "ADMINISTRATIVO")
                .requestMatchers(HttpMethod.PATCH, "/api/reportes/*/estado").hasRole("MANTENIMIENTO")
                .requestMatchers(HttpMethod.GET, "/api/reportes").hasRole("MANTENIMIENTO")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> {
                    bitacora.warn("401 sin token valido metodo={} uri={} ip={}", req.getMethod(), req.getRequestURI(), req.getRemoteAddr());
                    RespuestaJson.escribir(res, 401, "Tu sesión no es válida o expiró. Inicia sesión de nuevo.");
                })
                .accessDeniedHandler((req, res, ex) -> {
                    bitacora.warn("403 rol sin permiso metodo={} uri={} usuario={}", req.getMethod(), req.getRequestURI(),
                            req.getUserPrincipal() == null ? "-" : req.getUserPrincipal().getName());
                    RespuestaJson.escribir(res, 403, "No tienes permiso para realizar esta acción.");
                }))
            .addFilterBefore(new JwtFilter(jwt), UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(new LimiteSolicitudesFilter(limite), JwtFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.origenes}") String origenes) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOriginPatterns(Arrays.stream(origenes.split(",")).map(String::trim).toList());
        c.setAllowedMethods(List.of("GET", "POST", "PATCH", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
        s.registerCorsConfiguration("/api/**", c);
        return s;
    }
}
