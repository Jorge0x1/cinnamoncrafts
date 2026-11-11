export type Venta = {
    id: number;
    Fecha: string;
    ProductoId: number | null;
    Producto: string;
    Cantidad: number;
    Monto: number;
    Vendedor: string | null;
};
