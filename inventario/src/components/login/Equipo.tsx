import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../utils/supabase';
import Avatar from '../perfil/Avatar';
import './Equipo.css';

// "Conoce al equipo": lista publica de usuarios con su foto y puesto
// usa la funcion equipo() de supabase, que solo expone usuario, puesto y foto

interface Integrante {
    usuario: string;
    puesto: string | null;
    foto: string | null;
}

interface EquipoProps {
    onCerrar: () => void;
}

function Equipo({ onCerrar }: EquipoProps) {
    const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            const { data, error: errorConsulta } = await supabase.rpc('equipo');
            if (cancelado) return;
            if (errorConsulta) {
                console.error('error al traer el equipo:', errorConsulta);
                setError(true);
            } else {
                setIntegrantes((data ?? []) as Integrante[]);
            }
            setCargando(false);
        })();
        return () => {
            cancelado = true;
        };
    }, []);

    return createPortal(
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal-content equipo-modal" onClick={(e) => e.stopPropagation()}>
                <div className="equipo-encabezado">
                    <h3>Conoce al equipo</h3>
                    <button type="button" className="equipo-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
                </div>

                {cargando && <p className="equipo-mensaje">Cargando…</p>}
                {!cargando && error && <p className="equipo-mensaje">No se pudo cargar el equipo.</p>}

                {!cargando && !error && (
                    <ul className="equipo-lista">
                        {integrantes.map((i) => (
                            <li key={i.usuario} className="equipo-tarjeta">
                                <Avatar usuario={i.usuario} foto={i.foto} tamano={56} />
                                <div className="equipo-datos">
                                    <strong>{i.usuario}</strong>
                                    {i.puesto && <span className="equipo-puesto">{i.puesto}</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>,
        document.body
    );
}

export default Equipo;
