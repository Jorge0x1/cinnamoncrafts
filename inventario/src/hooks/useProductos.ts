import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import type { Producto } from '../types';

// acceso al inventario en supabase
// cada operacion regresa null si salio bien o un mensaje de error para mostrarlo al usuario

export type Resultado = string | null;

function useProductos() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [cargando, setCargando] = useState(true);

    const traer = useCallback(async () => {
        const { data, error } = await supabase.from('Inventario').select('*');
        if (error) {
            console.error('error al traer productos:', error);
        } else {
            setProductos((data ?? []) as Producto[]);
        }
        setCargando(false);
    }, []);

    useEffect(() => {
        void traer();
    }, [traer]);

    const insertar = async (producto: Omit<Producto, 'id'>): Promise<Resultado> => {
        const { error } = await supabase.from('Inventario').insert(producto);
        await traer();
        return error ? error.message : null;
    };

    const editar = async (id: number, producto: Omit<Producto, 'id'>): Promise<Resultado> => {
        const { data, error } = await supabase.from('Inventario').update(producto).eq('id', id).select('id');
        await traer();
        if (error) return error.message;
        if (!data || data.length === 0) return 'no se encontró el producto';
        return null;
    };

    const eliminar = async (id: number): Promise<Resultado> => {
        const { data, error } = await supabase.from('Inventario').delete().eq('id', id).select('id');
        await traer();
        if (error) return error.message;
        if (!data || data.length === 0) return 'no se encontró el producto';
        return null;
    };

    // la funcion registrar_venta (en supabase) valida stock, descuenta inventario y guarda el vendedor
    const vender = async (items: { id: number; cantidad: number }[]): Promise<Resultado> => {
        const { error } = await supabase.rpc('registrar_venta', { items });
        await traer();
        return error ? error.message : null;
    };

    return {
        productos,
        cargando,
        traer,
        insertar,
        editar,
        eliminar,
        vender,
    };
}

export default useProductos;
