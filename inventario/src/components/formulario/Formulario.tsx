import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Producto } from '../../types';
import './Formulario.css';

// formulario para crear o editar productos del inventario
// sincroniza campos con el producto a editar y valida valores

interface FormularioProps {
    insertar: (producto: Omit<Producto, 'id'>) => Promise<void>;
    actualizar: (id: number, producto: Omit<Producto, 'id'>) => Promise<void>;
    productoEditar: Producto | null;
    setProductoEditar: (producto: Producto | null) => void;
}

function Formulario({ insertar, actualizar, productoEditar, setProductoEditar }: FormularioProps) {
    const [Nombre, setNombre] = useState(productoEditar?.Nombre ?? '');
    const [Precio, setPrecio] = useState(productoEditar?.Precio ?? 0);
    const [Cantidad, setCantidad] = useState(productoEditar?.Cantidad ?? 0);
    const [Promocion, setPromocion] = useState(productoEditar?.Promocion ?? '');

    useEffect(() => {
        setNombre(productoEditar?.Nombre ?? '');
        setPrecio(productoEditar?.Precio ?? 0);
        setCantidad(productoEditar?.Cantidad ?? 0);
        setPromocion(productoEditar?.Promocion ?? '');
    }, [productoEditar]);

    const normalizarValorNoNegativo = (valor: string) => {
        const numero = Number(valor);
        return Number.isNaN(numero) ? 0 : Math.max(0, numero);
    };

    const normalizarValorPositivo = (valor: string) => {
        const numero = Number(valor);
        return Number.isNaN(numero) ? 0 : Math.max(0, numero);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (Precio <= 0) {
            return;
        }

        const nuevoProducto = {
            Nombre,
            Precio,
            Cantidad: Math.max(0, Cantidad),
            Promocion,
        };

        if (productoEditar) {
            void actualizar(productoEditar.id, nuevoProducto);
            setProductoEditar(null);
        } else {
            void insertar(nuevoProducto);
        }

        setNombre('');
        setCantidad(0);
        setPrecio(0);
        setPromocion('');
    };

    return (
        <form onSubmit={handleSubmit} className="formulario">
            <h3>{productoEditar ? 'Editar Producto' : 'Agregar Producto'}</h3>
            <div className="form-group">
                <label htmlFor="form-nombre" className="form-label">Nombre</label>
                <input id="form-nombre" type="text" placeholder="Nombre" value={Nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="form-group">
                <label htmlFor="form-precio" className="form-label">Precio</label>
                <input id="form-precio" type="number" min="0.01" step="0.01" placeholder="Precio" value={Precio === 0 ? '' : Precio} onChange={(e) => setPrecio(normalizarValorPositivo(e.target.value))} required />
            </div>
            <div className="form-group">
                <label htmlFor="form-cantidad" className="form-label">Cantidad</label>
                <input id="form-cantidad" type="number" min="0" placeholder="Cantidad" value={Cantidad === 0 ? '' : Cantidad} onChange={(e) => setCantidad(normalizarValorNoNegativo(e.target.value))} required />
            </div>
            <div className="form-group">
                <label htmlFor="form-promocion" className="form-label">Promoción</label>
                <input id="form-promocion" type="text" placeholder="Promoción" value={Promocion} onChange={(e) => setPromocion(e.target.value)} />
            </div>
            <button type="submit" className="btn-submit">{productoEditar ? 'Actualizar' : 'Guardar'}</button>
        </form>
    );
}

export default Formulario;