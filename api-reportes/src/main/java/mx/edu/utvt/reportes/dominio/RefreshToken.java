package mx.edu.utvt.reportes.dominio;

import jakarta.persistence.*;
import java.time.Instant;

/** Token de renovación. Solo se guarda su hash SHA-256, nunca el valor original. */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @ManyToOne(optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(nullable = false)
    private Instant expira;

    @Column(nullable = false)
    private boolean revocado = false;

    protected RefreshToken() { }

    public RefreshToken(String tokenHash, Usuario usuario, Instant expira) {
        this.tokenHash = tokenHash;
        this.usuario = usuario;
        this.expira = expira;
    }

    public boolean esValido() { return !revocado && Instant.now().isBefore(expira); }
    public void revocar() { this.revocado = true; }
    public Usuario getUsuario() { return usuario; }
}
