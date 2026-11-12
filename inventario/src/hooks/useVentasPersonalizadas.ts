import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import type { VentaPersonalizada } from '../types';
import type { Resultado } from './useProductos';

// productos sobre pedido ya vendidos (no son stock)
// registrar solo lo pueden hacer CEO y Director; lo valida la funcion en supabase

export interface ItemPersonalizado {
    producto: string;
    descripcion: string;
    precio: number;
}

function useVentasPersonalizadas() {
    const [ventas, setVentas] = useState<VentaPersonalizada[]>([]);
    const [cargando, setCargando] = useState(true);

    const traer = useCallback(async () => {
        const { data, error } = await supabase
            .from('VentasPersonalizadas')
            .select('*')
            .order('Fecha', { ascending: false });
        if (error) {
            console.error('error al traer ventas personalizadas:', error);
        } else {
            setVentas((data ?? []) as VentaPersonalizada[]);
        }
        setCargando(false);
    }, []);

    useEffect(() => {
        void traer();
    }, [traer]);

    const registrar = async (items: ItemPersonalizado[]): Promise<Resultado> => {
        const { error } = await supabase.rpc('registrar_venta_personalizada', { items });
        await traer();
        return error ? error.message : null;
    };

    const eliminar = async (id: number): Promise<Resultado> => {
        const { data, error } = await supabase.from('VentasPersonalizadas').delete().eq('id', id).select('id');
        await traer();
        if (error) return error.message;
        if (!data || data.length === 0) return 'no se encontró la venta';
        return null;
    };

    return { ventas, cargando, traer, registrar, eliminar };
}

export default useVentasPersonalizadas;
