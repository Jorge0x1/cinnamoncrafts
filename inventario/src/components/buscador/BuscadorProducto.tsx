import { useState } from 'react';
import type { Producto } from '../../types';
import { formatoMoneda, normalizar } from '../../utils/formato';
import './BuscadorProducto.css';

// selector de producto con busqueda por texto (mas comodo que un select largo en el celular)

interface BuscadorProductoProps {
    productos: Producto[];
    seleccionado: Producto | undefined;
    onSeleccionar: (id: number | null) => void;
}

const MAX_RESULTADOS = 8;

function BuscadorProducto({ productos, seleccionado, onSeleccionar }: BuscadorProductoProps) {
    const [texto, setTexto] = useState('');
    const [abierto, setAbierto] = useState(false);

    if (seleccionado) {
        return (
            <div className="buscador-seleccionado">
                <div className="buscador-seleccionado-info">
                    <strong>{seleccionado.Nombre}</strong>
                    <small>{formatoMoneda(seleccionado.Precio)} · {seleccionado.Cantidad} disp.</small>
                </div>
                <button
                    type="button"
                    className="btn-cambiar"
                    onClick={() => {
                        onSeleccionar(null);
                        setTexto('');
                    }}
                >
                    Cambiar
                </button>
            </div>
        );
    }

    const busqueda = normalizar(texto);
    const resultados = productos
        .filter((p) => normalizar(p.Nombre).includes(busqueda))
        .slice(0, MAX_RESULTADOS);

    return (
        <div className="buscador">
            <input
                type="search"
                placeholder="Buscar producto…"
                value={texto}
                onChange={(e) => {
                    setTexto(e.target.value);
                    setAbierto(true);
                }}
                onFocus={() => setAbierto(true)}
                onBlur={() => setAbierto(false)}
                aria-label="Buscar producto"
            />
            {abierto && (
                <ul className="buscador-lista">
                    {resultados.length === 0 && <li className="buscador-vacio">Sin resultados</li>}
                    {resultados.map((p) => (
                        <li key={p.id}>
                            <button
                                type="button"
                                disabled={p.Cantidad <= 0}
                                // evita que el input pierda el foco antes del click
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onSeleccionar(p.id);
                                    setAbierto(false);
                                }}
                            >
                                <span>{p.Nombre}</span>
                                <small>
                                    {formatoMoneda(p.Precio)} · {p.Cantidad > 0 ? `${p.Cantidad} disp.` : 'Agotado'}
                                </small>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default BuscadorProducto;
