import { useState } from 'react';
import { createPortal } from 'react-dom';
import { formatoMoneda } from '../../utils/formato';
import { IconoEditar, IconoEliminar } from '../iconos/Iconos';
import './TableList.css';

// tarjeta compacta de un producto del inventario
// muestra nombre, precio, stock y promocion en poco espacio, con botones para editar o eliminar
// uso de portal para el modal de confirmacion para evitar problemas de posicion

interface TableListProps {
    Nombre: string;
    Cantidad: number;
    Precio: number;
    Promocion: string;
    // sin estas funciones no se muestran los botones (usuarios que no pueden editar)
    onEditar?: () => void;
    onEliminar?: () => void;
}

function TableList({ Nombre, Cantidad, Precio, Promocion, onEditar, onEliminar }: TableListProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    // nivel de stock para el color del borde y la etiqueta
    const stockClass = Cantidad >= 10 ? 'stock-alto' : Cantidad >= 5 ? 'stock-medio' : 'stock-bajo';
    const textoStock = Cantidad <= 0 ? 'Agotado' : Cantidad < 5 ? `Quedan ${Cantidad}` : `${Cantidad} pzs`;

    const confirmarEliminar = () => {
        setShowConfirm(false);
        onEliminar?.();
    };

    return (
        <div className={`table-item ${stockClass}`}>
            <div className="item-info">
                <h4>{Nombre}</h4>
                <div className="item-meta">
                    <span className="item-precio">{formatoMoneda(Precio)}</span>
                    <span className={`badge badge-${stockClass}`}>{textoStock}</span>
                    {Promocion && <span className="badge badge-promo">🏷 {Promocion}</span>}
                </div>
            </div>
            {(onEditar || onEliminar) && (
                <div className="item-actions">
                    {onEditar && (
                        <button type="button" className="btn-icono btn-editar" onClick={onEditar} aria-label={`Editar ${Nombre}`} title="Editar">
                            <IconoEditar />
                        </button>
                    )}
                    {onEliminar && (
                        <button type="button" className="btn-icono btn-eliminar" onClick={() => setShowConfirm(true)} aria-label={`Eliminar ${Nombre}`} title="Eliminar">
                            <IconoEliminar />
                        </button>
                    )}
                </div>
            )}

            {showConfirm && createPortal(
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4>Confirmar eliminación</h4>
                        <p>¿Está seguro de que desea eliminar el producto "<strong>{Nombre}</strong>"?</p>
                        <div className="modal-actions">
                            <button type="button" className="btn-cancelar" onClick={() => setShowConfirm(false)}>Cancelar</button>
                            <button type="button" className="btn-confirmar" onClick={confirmarEliminar}>Eliminar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default TableList;
