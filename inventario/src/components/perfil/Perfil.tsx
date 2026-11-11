import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useToast } from '../../hooks';
import Avatar from './Avatar';
import EditorFoto from './EditorFoto';
import './Perfil.css';

// avatar circular con la foto o la inicial del usuario
// al tocarlo se despliega un menu con el nombre, cambiar imagen y salir

interface PerfilProps {
    usuario: string;
    foto: string | null;
    puesto: string | null;
    onCambiarFoto: (imagen: Blob) => Promise<string | null>;
    onSalir: () => void;
}

function Perfil({ usuario, foto, puesto, onCambiarFoto, onSalir }: PerfilProps) {
    const notificar = useToast();
    const [abierto, setAbierto] = useState(false);
    const [subiendo, setSubiendo] = useState(false);
    const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);
    const contenedor = useRef<HTMLDivElement>(null);
    const selectorArchivo = useRef<HTMLInputElement>(null);

    // cerrar el menu al tocar fuera o con Escape
    useEffect(() => {
        if (!abierto) return;
        const alTocarFuera = (e: PointerEvent) => {
            if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
        };
        const alPresionarTecla = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAbierto(false);
        };
        document.addEventListener('pointerdown', alTocarFuera);
        document.addEventListener('keydown', alPresionarTecla);
        return () => {
            document.removeEventListener('pointerdown', alTocarFuera);
            document.removeEventListener('keydown', alPresionarTecla);
        };
    }, [abierto]);

    // al elegir una foto se abre la vista previa para acomodarla
    const alElegirArchivo = (e: ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        e.target.value = ''; // permite volver a elegir la misma foto
        if (!archivo) return;
        setAbierto(false);
        setArchivoPendiente(archivo);
    };

    const guardarFoto = async (imagen: Blob) => {
        setSubiendo(true);
        const error = await onCambiarFoto(imagen);
        setSubiendo(false);

        if (error) {
            notificar(`No se pudo cambiar la imagen: ${error}`, 'error');
        } else {
            notificar('Imagen de perfil actualizada');
            setArchivoPendiente(null);
        }
    };

    return (
        <div className="perfil" ref={contenedor}>
            <button
                type="button"
                className="perfil-avatar"
                onClick={() => setAbierto((a) => !a)}
                aria-haspopup="menu"
                aria-expanded={abierto}
                aria-label={`Perfil de ${usuario}`}
            >
                <Avatar usuario={usuario} foto={foto} tamano={40} />
            </button>

            {/* en iPhone y Android, accept="image/*" ofrece elegir de la fototeca o tomar una foto */}
            <input
                ref={selectorArchivo}
                type="file"
                accept="image/*"
                hidden
                onChange={alElegirArchivo}
            />

            {archivoPendiente && (
                <EditorFoto
                    archivo={archivoPendiente}
                    guardando={subiendo}
                    onCancelar={() => setArchivoPendiente(null)}
                    onGuardar={(imagen) => void guardarFoto(imagen)}
                />
            )}

            {abierto && (
                <div className="perfil-menu" role="menu">
                    <div className="perfil-menu-encabezado">
                        <Avatar usuario={usuario} foto={foto} tamano={48} />
                        <div className="perfil-datos">
                            <span className="perfil-nombre">{usuario}</span>
                            {puesto && <span className="perfil-puesto">{puesto}</span>}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="perfil-cambiar"
                        role="menuitem"
                        onClick={() => selectorArchivo.current?.click()}
                        disabled={subiendo}
                    >
                        {subiendo ? 'Subiendo…' : 'Cambiar imagen'}
                    </button>
                    <button type="button" className="perfil-salir" role="menuitem" onClick={onSalir} disabled={subiendo}>
                        Salir
                    </button>
                </div>
            )}
        </div>
    );
}

export default Perfil;
