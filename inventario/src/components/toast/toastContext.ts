import { createContext } from 'react';

export type TipoAviso = 'exito' | 'error';

export type Notificar = (mensaje: string, tipo?: TipoAviso) => void;

export const ToastContext = createContext<Notificar>(() => {});
