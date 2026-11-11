import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Producto } from '../../types';
import { useToast } from '../../hooks';
import { formatoMoneda } from '../../utils/formato';
import BuscadorProducto from '../buscador/BuscadorProducto';
import './Venta.css';

// modal de venta
// permite buscar uno o mas productos con su cantidad,
// calcula el total, recibe con cuanto pagaron (con botones rapidos) y muestra el cambio

interface VentaProps {
    productos: Producto[];
    // regresa null si salio bien o el mensaje de error
    onConfirmar: (items: { id: number; cantidad: number }[]) => Promise<string | null>;
}

interface LineaVenta {
    key: number;
    productoId: number | null;
    cantidad: number;
}

const BILLETES = [50, 100, 200, 500];

let siguienteKey = 0;
const nuevaLinea = (): LineaVenta => ({ key: siguienteKey++, productoId: null, cantidad: 1 });

function Venta({ productos, onConfirmar }: VentaProps) {
    const notificar = useToast();
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
        const error = await onConfirmar(lineasValidas.map((l) => ({ id: l.productoId as number, cantidad: l.cantidad })));
        setGuardando(false);
        if (error) {
            notificar(`No se pudo registrar la venta: ${error}`, 'error');
            return;
        }
        notificar(cambio > 0 ? `Venta registrada · Cambio: ${formatoMoneda(cambio)}` : 'Venta registrada');
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
                                        <div className="venta-linea-producto">
                                            <BuscadorProducto
                                                productos={opciones}
                                                seleccionado={producto}
                                                onSeleccionar={(id) => actualizarLinea(linea.key, { productoId: id })}
                                            />
                                        </div>
                                        <div className="venta-linea-detalle">
                                            <div className="stepper">
                                                <button
                                                    type="button"
                                                    onClick={() => actualizarLinea(linea.key, { cantidad: Math.max(1, linea.cantidad - 1) })}
                                                    disabled={linea.cantidad <= 1}
                                                    aria-label="Menos"
                                                >
                                                    −
                                                </button>
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="1"
                                                    max={producto?.Cantidad}
                                                    value={linea.cantidad === 0 ? '' : linea.cantidad}
                                                    onChange={(e) => actualizarLinea(linea.key, { cantidad: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                                                    className={sinStock ? 'input-error' : ''}
                                                    aria-label="Cantidad"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => actualizarLinea(linea.key, { cantidad: linea.cantidad + 1 })}
                                                    disabled={producto ? linea.cantidad >= producto.Cantidad : false}
                                                    aria-label="Más"
                                                >
                                                    +
                                                </button>
                                            </div>
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
                                        </div>
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
                                <strong className="venta-total">{formatoMoneda(total)}</strong>
                            </div>
                            <div className="venta-fila">
                                <label htmlFor="venta-pago">Pagó con</label>
                                <input
                                    id="venta-pago"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={pago}
                                    onChange={(e) => setPago(e.target.value)}
                                />
                            </div>
                            <div className="pago-rapido">
                                <button type="button" onClick={() => setPago(total.toFixed(2))} disabled={total === 0}>
                                    Exacto
                                </button>
                                {BILLETES.filter((b) => b >= total).map((b) => (
                                    <button
                                        type="button"
                                        key={b}
                                        className={pagoNumero === b ? 'activo' : ''}
                                        onClick={() => setPago(String(b))}
                                    >
                                        {formatoMoneda(b).replace('.00', '')}
                                    </button>
                                ))}
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
