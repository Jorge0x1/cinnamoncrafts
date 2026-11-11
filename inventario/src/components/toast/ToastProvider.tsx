import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from './toastContext';
import type { TipoAviso } from './toastContext';
import './Toast.css';

// muestra avisos flotantes (venta registrada, errores, etc.) que se quitan solos

interface Aviso {
    id: number;
    mensaje: string;
    tipo: TipoAviso;
}

let siguienteId = 0;

function ToastProvider({ children }: { children: ReactNode }) {
    const [avisos, setAvisos] = useState<Aviso[]>([]);

    const quitar = useCallback((id: number) => {
        setAvisos((prev) => prev.filter((a) => a.id !== id));
    }, []);

    const notificar = useCallback((mensaje: string, tipo: TipoAviso = 'exito') => {
        const id = siguienteId++;
        setAvisos((prev) => [...prev, { id, mensaje, tipo }]);
        setTimeout(() => quitar(id), tipo === 'error' ? 6000 : 3500);
    }, [quitar]);

    return (
        <ToastContext.Provider value={notificar}>
            {children}
            <div className="toasts" role="status" aria-live="polite">
                {avisos.map((aviso) => (
                    <button type="button" key={aviso.id} className={`toast toast-${aviso.tipo}`} onClick={() => quitar(aviso.id)}>
                        {aviso.tipo === 'exito' ? '✓ ' : '⚠ '}{aviso.mensaje}
                    </button>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export default ToastProvider;
