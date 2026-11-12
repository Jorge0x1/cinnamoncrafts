import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { VentaPersonalizada } from '../../types';
import { formatoMoneda } from '../../utils/formato';
import { IconoEliminar } from '../iconos/Iconos';
import './TableList.css';

// tarjeta de un producto personalizado ya vendido (sobre pedido, no es stock)

interface TarjetaPersonalizadaProps {
    venta: VentaPersonalizada;
    // sin esta funcion no se muestra el boton (usuarios que no pueden editar)
    onEliminar?: () => void;
}

const formatoFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

function TarjetaPersonalizada({ venta, onEliminar }: TarjetaPersonalizadaProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="table-item personalizado">
            <div className="item-info">
                <h4>{venta.Producto}</h4>
                {venta.Descripcion && <p className="item-descripcion">{venta.Descripcion}</p>}
                <div className="item-meta">
                    <span className="item-precio">{formatoMoneda(Number(venta.Precio))}</span>
                    <span className="badge badge-vendido">✓ Vendido</span>
                    <span className="item-fecha">
                        {formatoFecha(venta.Fecha)}{venta.Vendedor ? ` · ${venta.Vendedor}` : ''}
                    </span>
                </div>
            </div>
            {onEliminar && (
                <div className="item-actions">
                    <button
                        type="button"
                        className="btn-icono btn-eliminar"
                        onClick={() => setShowConfirm(true)}
                        aria-label={`Eliminar venta de ${venta.Producto}`}
                        title="Eliminar venta"
                    >
                        <IconoEliminar />
                    </button>
                </div>
            )}

            {showConfirm && createPortal(
                <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h4>Eliminar venta personalizada</h4>
                        <p>
                            ¿Eliminar la venta de "<strong>{venta.Producto}</strong>" por{' '}
                            <strong>{formatoMoneda(Number(venta.Precio))}</strong>?
                        </p>
                        <div className="modal-actions">
                            <button type="button" className="btn-cancelar" onClick={() => setShowConfirm(false)}>Cancelar</button>
                            <button
                                type="button"
                                className="btn-confirmar"
                                onClick={() => {
                                    setShowConfirm(false);
                                    onEliminar?.();
                                }}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default TarjetaPersonalizada;
