-- tabla de ventas
-- cada producto vendido genera su propio registro:
-- si una venta incluye 2 productos se insertan 2 filas

create table if not exists public."Ventas" (
    id bigint generated always as identity primary key,
    "Fecha" timestamptz not null default now(),
    "ProductoId" bigint references public."Inventario"(id) on delete set null,
    "Producto" text not null,
    "Cantidad" integer not null default 1 check ("Cantidad" > 0),
    "Monto" numeric(10, 2) not null check ("Monto" >= 0)
);

-- si la tabla ya existia sin la columna Cantidad, esto la agrega (las filas viejas quedan en 1)
alter table public."Ventas"
    add column if not exists "Cantidad" integer not null default 1 check ("Cantidad" > 0);

create index if not exists ventas_fecha_idx on public."Ventas" ("Fecha");

-- permisos (row level security)
-- igual que el inventario, la app usa la llave publica, asi que se permite leer e insertar
alter table public."Ventas" enable row level security;

create policy "ventas_select" on public."Ventas"
    for select to anon, authenticated using (true);

create policy "ventas_insert" on public."Ventas"
    for insert to anon, authenticated with check (true);
