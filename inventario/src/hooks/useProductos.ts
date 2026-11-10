import { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase";
import type { Producto } from '../types';

function useProductos() {
    const [productos, setProductos] = useState<Producto[]>([]);

    useEffect(() => {
        (async () => {
            const { data, error } = await supabase.from('Inventario').select('*')
            if (error) {
                console.error('supabase select error:', error)
            }
            else if (data) {
                console.log('supabase fetched productos:', data)
                setProductos(data as Producto[])
            }
        })()
        // traer datos al montar el componente
    }, [])

    const traer = async () => {
        const { data, error } = await supabase.from('Inventario').select('*')
        if (error) {
            console.error('Supabase traer error:', error)
            return
        }
        if (data) {
            console.log('Supabase traer productos:', data)
            setProductos(data as Producto[])
        }
        // funcion reutilizable para recargar los datos
    }

    const insertar = async (producto: Omit<Producto, 'id'>) => {
        try {
            const { error } = await supabase.from('Inventario').insert(producto)
            if (error) {
                console.error('error al insertar producto:', error);
            }
            // recargar lista despues de insertar
            await traer();
        } 
        catch (error) {
            console.error('error al insertar producto:', error);
        }
    }
    
    const editar = async (id: number, producto: Omit<Producto, 'id'>) => {
        try {
            console.log('editar producto:', { id, producto })
            const { data, error } = await supabase
                .from('Inventario')
                .update(producto)
                .eq('id', id)
                .select('*')
            if (error) {
                console.error('error al editar producto:', error);
            } else if (!data || data.length === 0) {
                console.warn('la actualizacion no afecto filas. revisar policies en supabase')
            } else {
                console.log('supabase editar response:', data)
            }
            // recargar lista para sincronizar ui
            await traer();
        } 
        catch (error) {
            console.error('error al editar producto:', error);
        }
    }

    const eliminar = async (id: number) => {
        try {
            const { error } = await supabase.from('Inventario').delete().eq('id', id)
            if (error) {
                console.error('error al eliminar producto:', error);
            }
            await traer();
        } 
        catch (error) {
            console.error('error al eliminar producto:', error);
        }
    }

    // registra una venta descontando del inventario la cantidad vendida de cada producto
    const vender = async (items: { id: number; cantidad: number }[]) => {
        try {
            for (const item of items) {
                const producto = productos.find((p) => p.id === item.id)
                if (!producto) continue
                const { error } = await supabase
                    .from('Inventario')
                    .update({ Cantidad: Math.max(0, producto.Cantidad - item.cantidad) })
                    .eq('id', item.id)
                if (error) {
                    console.error('error al registrar venta:', error);
                }
            }
            await traer();
        }
        catch (error) {
            console.error('error al registrar venta:', error);
        }
    }

    return {
        productos,
        traer,
        insertar,
        editar,
        eliminar,
        vender
    }
}

export default useProductos;