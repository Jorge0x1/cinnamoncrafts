import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../hooks';
import type { ItemPersonalizado } from '../../hooks';
import { formatoMoneda } from '../../utils/formato';
import './Venta.css';

// modal de venta personalizada (productos sobre pedido, sin stock)
// un producto por venta, con nombre, descripcion y precio libre;
// igual que la venta normal: total, con cuanto pagaron y cambio

interface VentaPersonalizadaProps {
    // regresa null si salio bien o el mensaje de error
    onConfirmar: (items: ItemPersonalizado[]) => Promise<string | null>;
}

interface LineaPersonalizada {
    key: number;
    producto: string;
    descripcion: string;
    precio: string;
}

const BILLETES = [50, 100, 200, 500];

let siguienteKey = 0;
const nuevaLinea = (): LineaPersonalizada => ({ key: siguienteKey++, producto: '', descripcion: '', precio: '' });

function VentaPersonalizada({ onConfirmar }: VentaPersonalizadaProps) {
    const notificar = useToast();
    const [abierto, setAbierto] = useState(false);
    const [lineas, setLineas] = useState<LineaPersonalizada[]>([nuevaLinea()]);
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

    const actualizarLinea = (key: number, cambios: Partial<LineaPersonalizada>) => {
        setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...cambios } : l)));
    };

    const precioDe = (linea: LineaPersonalizada) => {
        const n = Number(linea.precio);
        return Number.isFinite(n) && n > 0 ? n : 0;
    };

    const total = lineas.reduce((suma, l) => suma + precioDe(l), 0);
    const pagoNumero = Number(pago) || 0;
    const cambio = pagoNumero - total;

    const lineaCompleta = (l: LineaPersonalizada) => l.producto.trim() !== '' && precioDe(l) > 0;
    const todasCompletas = lineas.every(lineaCompleta);
    const puedeConfirmar = todasCompletas && pago !== '' && cambio >= 0 && !guardando;

    const confirmar = async () => {
        if (!puedeConfirmar) return;
        setGuardando(true);
        const error = await onConfirmar(
            lineas.map((l) => ({ producto: l.producto.trim(), descripcion: l.descripcion.trim(), precio: precioDe(l) }))
        );
        setGuardando(false);
        if (error) {
            notificar(`No se pudo registrar la venta: ${error}`, 'error');
            return;
        }
        notificar(cambio > 0 ? `Venta personalizada registrada · Cambio: ${formatoMoneda(cambio)}` : 'Venta personalizada registrada');
        setAbierto(false);
    };

    return (
        <>
            <button type="button" className="btn-header" onClick={abrir}>Venta Personalizada</button>

            {abierto && createPortal(
                <div className="modal-overlay" onClick={cerrar}>
                    <div className="modal-content venta-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Venta personalizada</h3>
                        <p className="venta-nota">Productos sobre pedido: no descuentan inventario.</p>

                        <div className="venta-lineas">
                            {lineas.map((linea) => (
                                <div key={linea.key} className="venta-linea">
                                    <div className="personalizada-campo">
                                        <label htmlFor={`pers-nombre-${linea.key}`}>Nombre</label>
                                        <input
                                            id={`pers-nombre-${linea.key}`}
                                            type="text"
                                            placeholder="Ej. Collar con nombre"
                                            value={linea.producto}
                                            onChange={(e) => actualizarLinea(linea.key, { producto: e.target.value })}
                                        />
                                    </div>
                                    <div className="personalizada-campo">
                                        <label htmlFor={`pers-desc-${linea.key}`}>Descripción</label>
                                        <textarea
                                            id={`pers-desc-${linea.key}`}
                                            rows={2}
                                            placeholder="Ej. Plata, nombre “Ana”, cadena de 45 cm"
                                            value={linea.descripcion}
                                            onChange={(e) => actualizarLinea(linea.key, { descripcion: e.target.value })}
                                        />
                                    </div>
                                    <div className="personalizada-campo personalizada-precio">
                                        <label htmlFor={`pers-precio-${linea.key}`}>Precio</label>
                                        <input
                                            id={`pers-precio-${linea.key}`}
                                            type="number"
                                            inputMode="decimal"
                                            min="0.01"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={linea.precio}
                                            onChange={(e) => actualizarLinea(linea.key, { precio: e.target.value })}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="venta-resumen">
                            <div className="venta-fila">
                                <span>Total</span>
                                <strong className="venta-total">{formatoMoneda(total)}</strong>
                            </div>
                            <div className="venta-fila">
                                <label htmlFor="pers-pago">Pagó con</label>
                                <input
                                    id="pers-pago"
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

export default VentaPersonalizada;
