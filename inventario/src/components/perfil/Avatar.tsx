import { useState } from 'react';
import './Perfil.css';

// circulo con la foto del usuario, o su inicial si no tiene foto (o si no carga)

interface AvatarProps {
    usuario: string;
    foto?: string | null;
    tamano?: number;
}

function Avatar({ usuario, foto, tamano = 40 }: AvatarProps) {
    const [fotoFallida, setFotoFallida] = useState<string | null>(null);
    const mostrarFoto = foto && foto !== fotoFallida;

    return (
        <span
            className="avatar"
            style={{ width: tamano, height: tamano, fontSize: tamano * 0.45 }}
            aria-hidden="true"
        >
            {mostrarFoto ? (
                <img src={foto} alt="" onError={() => setFotoFallida(foto)} />
            ) : (
                usuario.charAt(0).toUpperCase() || '?'
            )}
        </span>
    );
}

export default Avatar;
