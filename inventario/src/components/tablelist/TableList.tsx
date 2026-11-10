import { useState } from 'react';
import { createPortal } from 'react-dom';
import './TableList.css';

// componente que renderiza un item del inventario
// muestra detalles y ofrece botones para editar o eliminar
// uso de portal para el modal de confirmacion para evitar problemas de posicion

interface TableListProps {
    Nombre: string;
    Cantidad: number;
    Precio: number;
    Promocion: string;
    onEditar: () => void;
    onEliminar: () => void;
}

function TableList({ Nombre, Cantidad, Precio, Promocion, onEditar, onEliminar }: TableListProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    // calcular clase visual segun nivel de stock
    const stockClass = Cantidad >= 10 ? 'stock-alto' : Cantidad >= 5 ? 'stock-medio' : 'stock-bajo';

    const handleEliminar = () => {
        setShowConfirm(true);
    };

    const confirmarEliminar = () => {
        setShowConfirm(false);
        onEliminar();
    };

    return (
        <div className={`table-item ${stockClass}`}>
            <div className="item-header">
                <h4>{Nombre}</h4>
            </div>
            <div className="item-details">
                <p><strong>Cantidad:</strong> {Cantidad} unidades</p>
                <p><strong>Precio:</strong> ${Precio.toFixed(2)}</p>
                <p><strong>Promoción:</strong> {Promocion || 'Sin promoción'}</p>
            </div>
            <div className="item-actions">
                <button type="button" className="btn-editar" onClick={onEditar}>✎ Editar</button>
                <button type="button" className="btn-eliminar" onClick={handleEliminar}>🗑 Eliminar</button>
            </div>

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