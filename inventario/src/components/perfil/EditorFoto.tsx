import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { cargarImagen, recortarImagen } from '../../utils/imagen';
import './EditorFoto.css';

// vista previa para elegir que parte de la foto usar como perfil
// se arrastra la foto para moverla y se usa la barra (o la rueda del mouse) para acercar

interface EditorFotoProps {
    archivo: File;
    guardando: boolean;
    onCancelar: () => void;
    onGuardar: (imagen: Blob) => void;
}

interface Posicion {
    zoom: number;
    // esquina superior izquierda de la imagen dentro del visor, en pixeles de pantalla
    x: number;
    y: number;
}

const VISOR = 260;
const ZOOM_MAX = 4;

function EditorFoto({ archivo, guardando, onCancelar, onGuardar }: EditorFotoProps) {
    const [url, setUrl] = useState<string | null>(null);
    const [imagen, setImagen] = useState<HTMLImageElement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pos, setPos] = useState<Posicion>({ zoom: 1, x: 0, y: 0 });
    const arrastre = useRef<{ id: number; x: number; y: number } | null>(null);

    // cargar la imagen elegida
    useEffect(() => {
        const nuevaUrl = URL.createObjectURL(archivo);
        let cancelado = false;
        cargarImagen(nuevaUrl)
            .then((img) => {
                if (cancelado) return;
                const escala = escalaBase(img);
                setUrl(nuevaUrl);
                setImagen(img);
                // centrada
                setPos({
                    zoom: 1,
                    x: (VISOR - img.naturalWidth * escala) / 2,
                    y: (VISOR - img.naturalHeight * escala) / 2,
                });
            })
            .catch((e: Error) => !cancelado && setError(e.message));
        return () => {
            cancelado = true;
            URL.revokeObjectURL(nuevaUrl);
        };
    }, [archivo]);

    // escala con la que el lado mas corto de la imagen llena el visor
    const escalaBase = (img: HTMLImageElement) => VISOR / Math.min(img.naturalWidth, img.naturalHeight);

    // evita que queden huecos vacios dentro del circulo
    const limitar = (img: HTMLImageElement, p: Posicion): Posicion => {
        const escala = escalaBase(img) * p.zoom;
        const ancho = img.naturalWidth * escala;
        const alto = img.naturalHeight * escala;
        return {
            zoom: p.zoom,
            x: Math.min(0, Math.max(VISOR - ancho, p.x)),
            y: Math.min(0, Math.max(VISOR - alto, p.y)),
        };
    };

    // cambia el zoom manteniendo fijo el centro del visor
    const cambiarZoom = (nuevoZoom: number) => {
        if (!imagen) return;
        setPos((p) => {
            const zoom = Math.min(ZOOM_MAX, Math.max(1, nuevoZoom));
            const escalaAntes = escalaBase(imagen) * p.zoom;
            const escalaDespues = escalaBase(imagen) * zoom;
            const centroX = (VISOR / 2 - p.x) / escalaAntes;
            const centroY = (VISOR / 2 - p.y) / escalaAntes;
            return limitar(imagen, {
                zoom,
                x: VISOR / 2 - centroX * escalaDespues,
                y: VISOR / 2 - centroY * escalaDespues,
            });
        });
    };

    const alPresionar = (e: ReactPointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        arrastre.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };

    const alMover = (e: ReactPointerEvent<HTMLDivElement>) => {
        const actual = arrastre.current;
        if (!imagen || !actual || actual.id !== e.pointerId) return;
        const dx = e.clientX - actual.x;
        const dy = e.clientY - actual.y;
        arrastre.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        setPos((p) => limitar(imagen, { ...p, x: p.x + dx, y: p.y + dy }));
    };

    const alSoltar = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (arrastre.current?.id === e.pointerId) arrastre.current = null;
    };

    const alRueda = (e: ReactWheelEvent<HTMLDivElement>) => {
        cambiarZoom(pos.zoom - e.deltaY * 0.002);
    };

    const guardar = async () => {
        if (!imagen) return;
        const escala = escalaBase(imagen) * pos.zoom;
        try {
            const blob = await recortarImagen(imagen, {
                x: -pos.x / escala,
                y: -pos.y / escala,
                lado: VISOR / escala,
            });
            onGuardar(blob);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo procesar la imagen');
        }
    };

    const escala = imagen ? escalaBase(imagen) * pos.zoom : 1;

    return createPortal(
        <div className="modal-overlay" onClick={() => !guardando && onCancelar()}>
            <div className="modal-content editor-foto" onClick={(e) => e.stopPropagation()}>
                <h3>Ajustar foto</h3>
                <p className="editor-ayuda">Arrastra la foto para acomodarla y usa la barra para acercar.</p>

                <div
                    className="editor-visor"
                    style={{ width: VISOR, height: VISOR }}
                    onPointerDown={alPresionar}
                    onPointerMove={alMover}
                    onPointerUp={alSoltar}
                    onPointerCancel={alSoltar}
                    onWheel={alRueda}
                >
                    {url && imagen && (
                        <img
                            src={url}
                            alt="Vista previa"
                            draggable={false}
                            style={{
                                width: imagen.naturalWidth * escala,
                                height: imagen.naturalHeight * escala,
                                transform: `translate(${pos.x}px, ${pos.y}px)`,
                            }}
                        />
                    )}
                    {!imagen && !error && <span className="editor-cargando">Cargando…</span>}
                    <div className="editor-mascara" />
                </div>

                <div className="editor-zoom">
                    <span aria-hidden="true">−</span>
                    <input
                        type="range"
                        min={1}
                        max={ZOOM_MAX}
                        step={0.01}
                        value={pos.zoom}
                        onChange={(e) => cambiarZoom(Number(e.target.value))}
                        disabled={!imagen}
                        aria-label="Acercar"
                    />
                    <span aria-hidden="true">+</span>
                </div>

                {error && <p className="editor-error">{error}</p>}

                <div className="modal-actions">
                    <button type="button" className="btn-cancelar" onClick={onCancelar} disabled={guardando}>
                        Cancelar
                    </button>
                    <button type="button" className="btn-guardar-foto" onClick={() => void guardar()} disabled={!imagen || guardando}>
                        {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default EditorFoto;
