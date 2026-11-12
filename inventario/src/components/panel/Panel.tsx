import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useProductos, useToast, useVentasPersonalizadas } from '../../hooks';
import type { ItemPersonalizado, Resultado } from '../../hooks';
import type { Producto } from '../../types';
import { normalizar } from '../../utils/formato';
import TableList from '../tablelist/TableList';
import Formulario from '../formulario/Formulario';
import Venta from '../venta/Venta';
import VentaPersonalizada from '../venta/VentaPersonalizada';
import TarjetaPersonalizada from '../tablelist/TarjetaPersonalizada';
import Resumen from '../resumen/Resumen';
import Perfil from '../perfil/Perfil';

// pantalla principal (con sesion iniciada)
// maneja la vista actual (inventario / resumen), busqueda, orden y el modal del formulario

interface PanelProps {
    usuario: string;
    foto: string | null;
    puesto: string | null;
    // CEO y Director de Operaciones; lo decide supabase
    puedeEditar: boolean;
    onCambiarFoto: (imagen: Blob) => Promise<string | null>;
    onSalir: () => void;
}

function Panel({ usuario, foto, puesto, puedeEditar, onCambiarFoto, onSalir }: PanelProps) {
    const { productos, cargando, traer, insertar, editar, eliminar, vender } = useProductos();
    const personalizadas = useVentasPersonalizadas();
    const notificar = useToast();
    // que lista se muestra: productos con stock o personalizados vendidos (sobre pedido)
    const [catalogo, setCatalogo] = useState<'normales' | 'personalizados'>('normales');
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
    const [ordenSeleccionado, setOrdenSeleccionado] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [formularioAbierto, setFormularioAbierto] = useState(false);
    const [vista, setVista] = useState<'inventario' | 'resumen'>('inventario');
    const [ventasRegistradas, setVentasRegistradas] = useState(0);

    // muestra el aviso de exito o de error segun el resultado
    const avisar = (error: Resultado, exito: string, fallo: string) => {
        notificar(error ? `${fallo}: ${error}` : exito, error ? 'error' : 'exito');
    };

    const insertarProducto = async (producto: Omit<Producto, 'id'>) => {
        avisar(await insertar(producto), 'Producto guardado', 'No se pudo guardar');
    };

    const editarProducto = async (id: number, producto: Omit<Producto, 'id'>) => {
        avisar(await editar(id, producto), 'Producto actualizado', 'No se pudo actualizar');
    };

    const eliminarProducto = async (id: number) => {
        avisar(await eliminar(id), 'Producto eliminado', 'No se pudo eliminar');
    };

    const registrarVenta = async (items: { id: number; cantidad: number }[]) => {
        const error = await vender(items);
        if (!error) setVentasRegistradas((n) => n + 1);
        return error;
    };

    const registrarVentaPersonalizada = async (items: ItemPersonalizado[]) => {
        const error = await personalizadas.registrar(items);
        if (!error) setCatalogo('personalizados');
        return error;
    };

    const eliminarVentaPersonalizada = async (id: number) => {
        avisar(await personalizadas.eliminar(id), 'Venta personalizada eliminada', 'No se pudo eliminar');
    };

    const abrirFormulario = (producto: Producto | null) => {
        setProductoSeleccionado(producto);
        setFormularioAbierto(true);
    };

    const cerrarFormulario = () => {
        setFormularioAbierto(false);
        setProductoSeleccionado(null);
    };

    const productosVisibles = useMemo(() => {
        const texto = normalizar(busqueda);
        const filtrados = texto ? productos.filter((p) => normalizar(p.Nombre).includes(texto)) : [...productos];

        return filtrados.sort((a, b) => {
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
                default: {
                    // sin orden elegido: primero los productos con promocion
                    const tienePromo = (p: Producto) => (p.Promocion?.trim() ? 1 : 0);
                    return tienePromo(b) - tienePromo(a);
                }
            }
        });
    }, [ordenSeleccionado, productos, busqueda]);

    // personalizados: los mas recientes primero; se busca por nombre o descripcion
    const personalizadasVisibles = useMemo(() => {
        const texto = normalizar(busqueda);
        if (!texto) return personalizadas.ventas;
        return personalizadas.ventas.filter(
            (v) => normalizar(v.Producto).includes(texto) || normalizar(v.Descripcion).includes(texto)
        );
    }, [personalizadas.ventas, busqueda]);

    return (
        <div className="app-container">
            <div className="app-header">
                <h1>CinnamonCrafts</h1>
                <div className="header-perfil">
                    <Perfil usuario={usuario} foto={foto} puesto={puesto} onCambiarFoto={onCambiarFoto} onSalir={onSalir} />
                </div>
                <div className="header-acciones">
                    <button type="button" className="btn-header" onClick={() => setVista(vista === 'inventario' ? 'resumen' : 'inventario')}>
                        {vista === 'inventario' ? 'Resumen' : '← Inventario'}
                    </button>
                    {vista === 'inventario' && <Venta productos={productos} onConfirmar={registrarVenta} />}
                    {vista === 'inventario' && puedeEditar && <VentaPersonalizada onConfirmar={registrarVentaPersonalizada} />}
                </div>
            </div>

            {formularioAbierto && createPortal(
                <div className="modal-overlay" onClick={cerrarFormulario}>
                    <div className="modal-content formulario-modal" onClick={(e) => e.stopPropagation()}>
                        <Formulario
                            key={productoSeleccionado ? productoSeleccionado.id : 'nuevo'}
                            insertar={insertarProducto}
                            actualizar={editarProducto}
                            productoEditar={productoSeleccionado}
                            setProductoEditar={setProductoSeleccionado}
                            onCerrar={cerrarFormulario}
                        />
                    </div>
                </div>,
                document.body
            )}

            {vista === 'resumen' && (
                <Resumen
                    puedeEditar={puedeEditar}
                    recargar={ventasRegistradas}
                    onVentaCancelada={() => {
                        void traer();
                        void personalizadas.traer();
                    }}
                />
            )}

            {vista === 'inventario' && (
                <div className="inventario-container">
                    <h2>Inventario</h2>
                    {catalogo === 'normales' && <div className="filtros-container">
                        {puedeEditar && (
                            <button type="button" className="btn-header" onClick={() => abrirFormulario(null)}>+ Agregar producto</button>
                        )}
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
                    </div>}

                    <div className="switch-catalogo" role="group" aria-label="Tipo de productos">
                        <button
                            type="button"
                            aria-pressed={catalogo === 'normales'}
                            onClick={() => setCatalogo('normales')}
                        >
                            Productos
                        </button>
                        <button
                            type="button"
                            aria-pressed={catalogo === 'personalizados'}
                            onClick={() => setCatalogo('personalizados')}
                        >
                            Personalizados
                        </button>
                    </div>

                    <input
                        type="search"
                        className="busqueda-inventario"
                        placeholder="🔍 Buscar producto…"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        aria-label="Buscar producto"
                    />

                    {catalogo === 'personalizados' && (
                        <>
                            {personalizadas.cargando && <p className="lista-mensaje">Cargando…</p>}
                            {!personalizadas.cargando && personalizadasVisibles.length === 0 && (
                                <p className="lista-mensaje">
                                    {busqueda
                                        ? `No hay personalizados que coincidan con "${busqueda}"`
                                        : 'Todavía no hay ventas personalizadas'}
                                </p>
                            )}
                            <div className="items-list">
                                {personalizadasVisibles.map((venta) => (
                                    <TarjetaPersonalizada
                                        key={venta.id}
                                        venta={venta}
                                        onEliminar={puedeEditar ? () => void eliminarVentaPersonalizada(venta.id) : undefined}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {catalogo === 'normales' && cargando && <p className="lista-mensaje">Cargando productos…</p>}
                    {catalogo === 'normales' && !cargando && productosVisibles.length === 0 && (
                        <p className="lista-mensaje">
                            {busqueda ? `No hay productos que coincidan con "${busqueda}"` : 'Todavía no hay productos'}
                        </p>
                    )}

                    {catalogo === 'normales' && <div className="items-list">
                        {productosVisibles.map((producto) => (
                            <TableList
                                key={producto.id}
                                Nombre={producto.Nombre}
                                Cantidad={producto.Cantidad}
                                Precio={producto.Precio}
                                Promocion={producto.Promocion}
                                onEditar={puedeEditar ? () => abrirFormulario(producto) : undefined}
                                onEliminar={puedeEditar ? () => {
                                    void eliminarProducto(producto.id);
                                    if (productoSeleccionado?.id === producto.id) {
                                        cerrarFormulario();
                                    }
                                } : undefined}
                            />
                        ))}
                    </div>}
                </div>
            )}
        </div>
    );
}

export default Panel;
