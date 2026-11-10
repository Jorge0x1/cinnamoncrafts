import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Producto } from '../../types';
import './Venta.css';

// modal de venta
// permite seleccionar uno o mas productos con su cantidad,
// calcula el total, recibe con cuanto pagaron y muestra el cambio

interface VentaProps {
    productos: Producto[];
    onConfirmar: (items: { id: number; cantidad: number }[]) => Promise<void>;
}

interface LineaVenta {
    key: number;
    productoId: number | null;
    cantidad: number;
}

let siguienteKey = 0;
const nuevaLinea = (): LineaVenta => ({ key: siguienteKey++, productoId: null, cantidad: 1 });

const formatoMoneda = (valor: number) => `$${valor.toFixed(2)}`;

function Venta({ productos, onConfirmar }: VentaProps) {
    const [abierto, setAbierto] = useState(false);
    const [lineas, setLineas] = useState<LineaVenta[]>([nuevaLinea()]);
    const [pago, setPago] = useState('');
    const [guardando, setGuardando] = useState(false);

    const abrir = () => {
        setLineas([nuevaLinea()]);
        setPago('');
        setAbierto(true);
    };

    const cerrar = () => {
        if (!guardando) setAbierto(false);
    };

    const actualizarLinea = (key: number, cambios: Partial<LineaVenta>) => {
        setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...cambios } : l)));
    };

    const quitarLinea = (key: number) => {
        setLineas((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
    };

    const productoDe = (linea: LineaVenta) => productos.find((p) => p.id === linea.productoId);

    const total = lineas.reduce((suma, linea) => {
        const producto = productoDe(linea);
        return producto ? suma + producto.Precio * linea.cantidad : suma;
    }, 0);

    const pagoNumero = Number(pago) || 0;
    const cambio = pagoNumero - total;

    const lineasValidas = lineas.filter((l) => l.productoId !== null && l.cantidad > 0);
    const excedeStock = lineas.some((l) => {
        const producto = productoDe(l);
        return producto ? l.cantidad > producto.Cantidad : false;
    });
    const puedeConfirmar = lineasValidas.length > 0 && !excedeStock && pago !== '' && cambio >= 0 && !guardando;

    const confirmar = async () => {
        if (!puedeConfirmar) return;
        setGuardando(true);
        await onConfirmar(lineasValidas.map((l) => ({ id: l.productoId as number, cantidad: l.cantidad })));
        setGuardando(false);
        setAbierto(false);
    };

    return (
        <>
            <button type="button" className="btn-venta" onClick={abrir}>Venta</button>

            {abierto && createPortal(
                <div className="modal-overlay" onClick={cerrar}>
                    <div className="modal-content venta-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Nueva venta</h3>

                        <div className="venta-lineas">
                            {lineas.map((linea) => {
                                const producto = productoDe(linea);
                                // no permitir elegir un producto que ya esta en otra linea
                                const usados = new Set(lineas.filter((l) => l.key !== linea.key).map((l) => l.productoId));
                                const opciones = productos.filter((p) => !usados.has(p.id));
                                const sinStock = producto ? linea.cantidad > producto.Cantidad : false;

                                return (
                                    <div key={linea.key} className="venta-linea">
                                        <select
                                            value={linea.productoId ?? ''}
                                            onChange={(e) => actualizarLinea(linea.key, { productoId: e.target.value ? Number(e.target.value) : null })}
                                        >
                                            <option value="">Selecciona un producto</option>
                                            {opciones.map((p) => (
                                                <option key={p.id} value={p.id} disabled={p.Cantidad <= 0}>
                                                    {p.Nombre} — {formatoMoneda(p.Precio)} ({p.Cantidad} disp.)
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            max={producto?.Cantidad}
                                            value={linea.cantidad === 0 ? '' : linea.cantidad}
                                            onChange={(e) => actualizarLinea(linea.key, { cantidad: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                                            className={sinStock ? 'input-error' : ''}
                                            aria-label="Cantidad"
                                        />
                                        <span className="venta-subtotal">
                                            {producto ? formatoMoneda(producto.Precio * linea.cantidad) : '—'}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn-quitar"
                                            onClick={() => quitarLinea(linea.key)}
                                            disabled={lineas.length === 1}
                                            aria-label="Quitar producto"
                                        >
                                            ✕
                                        </button>
                                        {sinStock && (
                                            <span className="venta-aviso">Solo hay {producto?.Cantidad} disponibles</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            className="btn-agregar-linea"
                            onClick={() => setLineas((prev) => [...prev, nuevaLinea()])}
                            disabled={lineas.length >= productos.length}
                        >
                            + Agregar producto
                        </button>

                        <div className="venta-resumen">
                            <div className="venta-fila">
                                <span>Total</span>
                                <strong>{formatoMoneda(total)}</strong>
                            </div>
                            <div className="venta-fila">
                                <label htmlFor="venta-pago">Pagó con</label>
                                <input
                                    id="venta-pago"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={pago}
                                    onChange={(e) => setPago(e.target.value)}
                                />
                            </div>
                            <div className={`venta-fila venta-cambio ${pago !== '' && cambio < 0 ? 'falta' : ''}`}>
                                <span>{pago !== '' && cambio < 0 ? 'Falta' : 'Cambio'}</span>
                                <strong>{pago === '' ? '—' : formatoMoneda(Math.abs(cambio))}</strong>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn-cancelar" onClick={cerrar} disabled={guardando}>Cancelar</button>
                            <button type="button" className="btn-confirmar-venta" onClick={() => void confirmar()} disabled={!puedeConfirmar}>
                                {guardando ? 'Guardando…' : 'Confirmar venta'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default Venta;
