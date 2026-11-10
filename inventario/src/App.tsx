import { useMemo, useState } from 'react';
import { useProductos } from './hooks';
import { TableList, Formulario, Venta } from './components';
import type { Producto } from './types';
import './App.css';

// componente app principal
// maneja el estado global de la vista: filtros, seleccion y orden
// muestra el formulario a la izquierda y el inventario a la derecha

function App() {
    const { productos, insertar, editar, eliminar, vender } = useProductos();
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
    const [ordenSeleccionado, setOrdenSeleccionado] = useState('');

    const productosOrdenados = useMemo(() => {
        const productosOrdenadosLocal = [...productos].sort((a, b) => {
            switch (ordenSeleccionado) {
                case 'nombre-asc':
                    return a.Nombre.localeCompare(b.Nombre);
                case 'nombre-desc':
                    return b.Nombre.localeCompare(a.Nombre);
                case 'precio-asc':
                    return a.Precio - b.Precio;
                case 'precio-desc':
                    return b.Precio - a.Precio;
                case 'cantidad-asc':
                    return a.Cantidad - b.Cantidad;
                case 'cantidad-desc':
                    return b.Cantidad - a.Cantidad;
                default:
                    return 0;
            }
        });

        return productosOrdenadosLocal;
    }, [ordenSeleccionado, productos]);

    return (
        <div className="app-container">
            <div className="app-header">
                <h1>Inventario</h1>
                <Venta productos={productos} onConfirmar={vender} />
            </div>
            <div className="app-layout">
                <div className="formulario-container">
                    <Formulario
                        key={productoSeleccionado ? productoSeleccionado.id : 'nuevo'}
                        insertar={insertar}
                        actualizar={editar}
                        productoEditar={productoSeleccionado}
                        setProductoEditar={setProductoSeleccionado}
                    />
                </div>
                <div className="inventario-container">
                    <h2>Productos</h2>
                    <div className="filtros-container">
                        <div className="filtro-container">
                            <label htmlFor="filtro-orden">Ordenar</label>
                            <select id="filtro-orden" value={ordenSeleccionado} onChange={(e) => setOrdenSeleccionado(e.target.value)}>
                                <option value="">Sin orden</option>
                                <option value="nombre-asc">Nombre ↑</option>
                                <option value="nombre-desc">Nombre ↓</option>
                                <option value="precio-asc">Precio ↑</option>
                                <option value="precio-desc">Precio ↓</option>
                                <option value="cantidad-asc">Cantidad ↑</option>
                                <option value="cantidad-desc">Cantidad ↓</option>
                            </select>
                        </div>
                    </div>
                    <div className="items-list">
                        {productosOrdenados.map((producto) => (
                            <TableList
                                key={producto.id}
                                Nombre={producto.Nombre}
                                Cantidad={producto.Cantidad}
                                Precio={producto.Precio}
                                Promocion={producto.Promocion}
                                onEditar={() => setProductoSeleccionado(producto)}
                                onEliminar={() => {
                                    void eliminar(producto.id);
                                    if (productoSeleccionado?.id === producto.id) {
                                        setProductoSeleccionado(null);
                                    }
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;