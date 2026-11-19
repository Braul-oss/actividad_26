package mx.edu.utvt.reportes.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import mx.edu.utvt.reportes.servicio.AuthService;
import mx.edu.utvt.reportes.web.dto.Dtos.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        return auth.login(req, http.getRemoteAddr());
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refrescar(req.refreshToken());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) RefreshRequest req) {
        auth.logout(req == null ? null : req.refreshToken());
        return ResponseEntity.noContent().build();
    }
}
