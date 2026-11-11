import { useState } from 'react';
import type { FormEvent } from 'react';
import './Login.css';

// pantalla de inicio de sesion
// la validacion de usuario y contraseña la hace supabase; quien tiene permiso lo decide la tabla Usuarios

interface LoginProps {
    onEntrar: (usuario: string, contrasena: string) => Promise<string | null>;
    noPermitido: boolean;
}

function Login({ onEntrar, noPermitido }: LoginProps) {
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [entrando, setEntrando] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setEntrando(true);
        setError(null);
        const mensaje = await onEntrar(usuario, contrasena);
        setEntrando(false);
        if (mensaje) setError(mensaje);
    };

    return (
        <div className="login-pantalla">
            <form className="login-tarjeta" onSubmit={(e) => void handleSubmit(e)}>
                <h1>CinnamonCrafts</h1>
                <p className="login-subtitulo">Inicia sesión para continuar</p>

                <div className="form-group">
                    <label htmlFor="login-usuario" className="form-label">Usuario</label>
                    <input
                        id="login-usuario"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="login-contrasena" className="form-label">Contraseña</label>
                    <input
                        id="login-contrasena"
                        type="password"
                        autoComplete="current-password"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        required
                    />
                </div>

                {(error || noPermitido) && (
                    <p className="login-error" role="alert">
                        {error ?? 'Este usuario no tiene permiso para usar la app'}
                    </p>
                )}

                <button type="submit" className="btn-submit" disabled={entrando}>
                    {entrando ? 'Entrando…' : 'Entrar'}
                </button>
            </form>
        </div>
    );
}

export default Login;
