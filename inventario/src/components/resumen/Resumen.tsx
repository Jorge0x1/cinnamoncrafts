import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../utils/supabase';
import { formatoMoneda } from '../../utils/formato';
import { useToast } from '../../hooks';
import type { Venta } from '../../types';
import './Resumen.css';

// vista de resumen (dashboard de ventas)
// arriba: indicadores (hoy, semana, mes, mas vendido del mes)
// abajo: ventas agrupadas por dia, con vendedor del dia, total y el detalle para cancelar ventas

interface ProductoDelDia {
    clave: string;
    nombre: string;
    cantidad: number;
    monto: number;
}

interface Dia {
    clave: string;
    fecha: Date;
    productos: ProductoDelDia[];
    ventas: Venta[];
    total: number;
    piezas: number;
    vendedorDelDia: { nombre: string; monto: number } | null;
}

// clave del dia en hora local (yyyy-mm-dd) para no mezclar dias por la zona horaria
const claveDia = (fecha: Date) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

const formatoDia = (fecha: Date) => {
    const texto = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const formatoHora = (fecha: Date) => fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });

// agrupar por id si existe, si no por nombre (producto eliminado)
const claveProducto = (venta: Venta) => (venta.ProductoId !== null ? `id-${venta.ProductoId}` : `nombre-${venta.Producto}`);

function agruparPorDia(ventas: Venta[]): Dia[] {
    const dias = new Map<string, { fecha: Date; ventas: Venta[] }>();

    for (const venta of ventas) {
        const fecha = new Date(venta.Fecha);
        const clave = claveDia(fecha);
        if (!dias.has(clave)) dias.set(clave, { fecha, ventas: [] });
        dias.get(clave)!.ventas.push(venta);
    }

    return [...dias.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([clave, { fecha, ventas: ventasDia }]) => {
            const productos = new Map<string, ProductoDelDia>();
            const vendedores = new Map<string, number>();

            for (const venta of ventasDia) {
                const k = claveProducto(venta);
                const actual = productos.get(k) ?? { clave: k, nombre: venta.Producto, cantidad: 0, monto: 0 };
                actual.cantidad += venta.Cantidad;
                actual.monto += Number(venta.Monto);
                productos.set(k, actual);

                if (venta.Vendedor) {
                    vendedores.set(venta.Vendedor, (vendedores.get(venta.Vendedor) ?? 0) + Number(venta.Monto));
                }
            }

            const lista = [...productos.values()].sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
            const [mejor] = [...vendedores.entries()].sort((a, b) => b[1] - a[1]);

            return {
                clave,
                fecha,
                productos: lista,
                ventas: ventasDia,
                total: lista.reduce((suma, p) => suma + p.monto, 0),
                piezas: lista.reduce((suma, p) => suma + p.cantidad, 0),
                vendedorDelDia: mejor ? { nombre: mejor[0], monto: mejor[1] } : null,
            };
        });
}

function calcularIndicadores(ventas: Venta[]) {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioSemana = new Date(inicioHoy);
    inicioSemana.setDate(inicioHoy.getDate() - ((inicioHoy.getDay() + 6) % 7)); // lunes
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const periodo = (desde: Date) => {
        const filtradas = ventas.filter((v) => new Date(v.Fecha) >= desde);
        return {
            monto: filtradas.reduce((s, v) => s + Number(v.Monto), 0),
            piezas: filtradas.reduce((s, v) => s + v.Cantidad, 0),
        };
    };

    const productosMes = new Map<string, { nombre: string; cantidad: number }>();
    for (const v of ventas) {
        if (new Date(v.Fecha) < inicioMes) continue;
        const k = claveProducto(v);
        const actual = productosMes.get(k) ?? { nombre: v.Producto, cantidad: 0 };
        actual.cantidad += v.Cantidad;
        productosMes.set(k, actual);
    }
    const [masVendido] = [...productosMes.values()].sort((a, b) => b.cantidad - a.cantidad);

    return {
        hoy: periodo(inicioHoy),
        semana: periodo(inicioSemana),
        mes: periodo(inicioMes),
        masVendido: masVendido ?? null,
    };
}

const textoPiezas = (n: number) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`;

interface ResumenProps {
    // cambia cada vez que se registra una venta para volver a cargar los datos
    recargar: number;
    // avisa que se cancelo una venta para recargar el inventario
    onVentaCancelada: () => void;
}

function Resumen({ recargar, onVentaCancelada }: ResumenProps) {
    const notificar = useToast();
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(false);
    const [version, setVersion] = useState(0);
    const [ventaACancelar, setVentaACancelar] = useState<Venta | null>(null);
    const [cancelando, setCancelando] = useState(false);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            setError(false);
            const { data, error: errorConsulta } = await supabase
                .from('Ventas')
                .select('*')
                .order('Fecha', { ascending: false });
            if (cancelado) return;
            if (errorConsulta) {
                console.error('error al traer ventas:', errorConsulta);
                setError(true);
            } else {
                setVentas((data ?? []) as Venta[]);
            }
            setCargando(false);
        })();
        return () => {
            cancelado = true;
        };
    }, [recargar, version]);

    const dias = useMemo(() => agruparPorDia(ventas), [ventas]);
    const indicadores = useMemo(() => calcularIndicadores(ventas), [ventas]);

    const confirmarCancelacion = async () => {
        if (!ventaACancelar) return;
        setCancelando(true);
        const { error: errorRpc } = await supabase.rpc('cancelar_venta', { venta_id: ventaACancelar.id });
        setCancelando(false);
        if (errorRpc) {
            notificar(`No se pudo eliminar la venta: ${errorRpc.message}`, 'error');
            return;
        }
        notificar(`Venta eliminada · ${textoPiezas(ventaACancelar.Cantidad)} regresaron al inventario`);
        setVentaACancelar(null);
        setVersion((v) => v + 1);
        onVentaCancelada();
    };

    return (
        <div className="resumen">
            <div className="kpis">
                <div className="kpi">
                    <span className="kpi-titulo">Hoy</span>
                    <strong className="kpi-valor">{formatoMoneda(indicadores.hoy.monto)}</strong>
                    <span className="kpi-detalle">{textoPiezas(indicadores.hoy.piezas)}</span>
                </div>
                <div className="kpi">
                    <span className="kpi-titulo">Esta semana</span>
                    <strong className="kpi-valor">{formatoMoneda(indicadores.semana.monto)}</strong>
                    <span className="kpi-detalle">{textoPiezas(indicadores.semana.piezas)}</span>
                </div>
                <div className="kpi">
                    <span className="kpi-titulo">Este mes</span>
                    <strong className="kpi-valor">{formatoMoneda(indicadores.mes.monto)}</strong>
                    <span className="kpi-detalle">{textoPiezas(indicadores.mes.piezas)}</span>
                </div>
                <div className="kpi kpi-destacado">
                    <span className="kpi-titulo">Más vendido del mes</span>
                    <strong className="kpi-valor kpi-texto">{indicadores.masVendido?.nombre ?? '—'}</strong>
                    <span className="kpi-detalle">
                        {indicadores.masVendido ? textoPiezas(indicadores.masVendido.cantidad) : 'Sin ventas este mes'}
                    </span>
                </div>
            </div>

            <div className="resumen-container">
                <h2>Ventas por día</h2>

                {cargando && <p className="resumen-mensaje">Cargando ventas…</p>}
                {!cargando && error && <p className="resumen-mensaje">No se pudieron cargar las ventas.</p>}
                {!cargando && !error && dias.length === 0 && <p className="resumen-mensaje">Todavía no hay ventas registradas.</p>}

                {!cargando && !error && (
                    <div className="resumen-dias">
                        {dias.map((dia) => (
                            <section key={dia.clave} className="resumen-dia">
                                <h4>{formatoDia(dia.fecha)}</h4>

                                <div className="vendedor-dia">
                                    <span>🏆 Vendedor del día</span>
                                    <strong>
                                        {dia.vendedorDelDia
                                            ? `${dia.vendedorDelDia.nombre} · ${formatoMoneda(dia.vendedorDelDia.monto)}`
                                            : 'Sin registrar'}
                                    </strong>
                                </div>

                                <table className="resumen-tabla">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th className="num">Cantidad</th>
                                            <th className="num">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dia.productos.map((p) => (
                                            <tr key={p.clave}>
                                                <td>{p.nombre}</td>
                                                <td className="num">{p.cantidad}</td>
                                                <td className="num">{formatoMoneda(p.monto)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td>Total del día</td>
                                            <td className="num">{dia.piezas}</td>
                                            <td className="num">{formatoMoneda(dia.total)}</td>
                                        </tr>
                                    </tfoot>
                                </table>

                                <details className="resumen-detalle">
                                    <summary>Ver cada venta ({dia.ventas.length})</summary>
                                    <ul>
                                        {dia.ventas.map((v) => (
                                            <li key={v.id}>
                                                <div className="detalle-info">
                                                    <span className="detalle-producto">{v.Cantidad} × {v.Producto}</span>
                                                    <small>
                                                        {formatoHora(new Date(v.Fecha))} · {v.Vendedor ?? 'Sin vendedor'}
                                                    </small>
                                                </div>
                                                <span className="detalle-monto">{formatoMoneda(Number(v.Monto))}</span>
                                                <button
                                                    type="button"
                                                    className="btn-icono btn-eliminar"
                                                    onClick={() => setVentaACancelar(v)}
                                                    aria-label={`Eliminar venta de ${v.Producto}`}
                                                    title="Eliminar venta"
                                                >
                                                    🗑
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            {ventaACancelar && createPortal(
                <div className="modal-overlay" onClick={() => !cancelando && setVentaACancelar(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h4>Eliminar venta</h4>
                        <p>
                            ¿Eliminar la venta de <strong>{ventaACancelar.Cantidad} × {ventaACancelar.Producto}</strong> por{' '}
                            <strong>{formatoMoneda(Number(ventaACancelar.Monto))}</strong>?
                        </p>
                        <p className="aviso-regreso">
                            {ventaACancelar.ProductoId !== null
                                ? `Las ${textoPiezas(ventaACancelar.Cantidad)} regresarán al inventario.`
                                : 'El producto ya no existe en el inventario, así que no se regresará stock.'}
                        </p>
                        <div className="modal-actions">
                            <button type="button" className="btn-cancelar" onClick={() => setVentaACancelar(null)} disabled={cancelando}>
                                Cancelar
                            </button>
                            <button type="button" className="btn-confirmar" onClick={() => void confirmarCancelacion()} disabled={cancelando}>
                                {cancelando ? 'Eliminando…' : 'Eliminar venta'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default Resumen;
