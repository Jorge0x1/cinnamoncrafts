-- ============================================================
-- 2) permisos, columna Vendedor y funciones de venta
-- correr DESPUES de 1_usuarios.sql (se puede volver a correr sin problema)
-- ============================================================

-- ¿el usuario con sesion iniciada esta en la tabla Usuarios?
create or replace function public.es_usuario_permitido()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from public."Usuarios" where id = auth.uid());
$$;

-- ---------- Usuarios ----------
drop policy if exists "usuarios_select" on public."Usuarios";
create policy "usuarios_select" on public."Usuarios"
    for select to authenticated
    using (id = auth.uid() or public.es_usuario_permitido());

-- ---------- Inventario ----------
-- se quitan las politicas anteriores (que permitian acceso con la llave publica)
do $$
declare
    p record;
begin
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'Inventario' loop
        execute format('drop policy %I on public."Inventario"', p.policyname);
    end loop;
end $$;

alter table public."Inventario" enable row level security;

create policy "inventario_usuarios_permitidos" on public."Inventario"
    for all to authenticated
    using (public.es_usuario_permitido())
    with check (public.es_usuario_permitido());

-- ---------- Ventas ----------
alter table public."Ventas" add column if not exists "Vendedor" text;

drop policy if exists "ventas_select" on public."Ventas";
drop policy if exists "ventas_insert" on public."Ventas";

-- solo lectura directa; registrar y cancelar ventas se hace con las funciones de abajo
create policy "ventas_select" on public."Ventas"
    for select to authenticated
    using (public.es_usuario_permitido());

-- registra una venta completa en una sola transaccion:
-- valida stock, descuenta inventario e inserta una fila por producto con el vendedor
-- items: [{"id": 1, "cantidad": 2}, ...]
create or replace function public.registrar_venta(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    item jsonb;
    prod record;
    vendedor text;
    cant integer;
begin
    select "Usuario" into vendedor from public."Usuarios" where id = auth.uid();
    if vendedor is null then
        raise exception 'Usuario no permitido';
    end if;

    if items is null or jsonb_array_length(items) = 0 then
        raise exception 'La venta no tiene productos';
    end if;

    for item in select * from jsonb_array_elements(items) loop
        cant := (item->>'cantidad')::integer;
        if cant is null or cant <= 0 then
            raise exception 'Cantidad inválida';
        end if;

        select * into prod from public."Inventario" where id = (item->>'id')::bigint for update;
        if not found then
            raise exception 'Producto no encontrado';
        end if;

        if prod."Cantidad" < cant then
            raise exception 'No hay suficiente "%": quedan %', prod."Nombre", prod."Cantidad";
        end if;

        update public."Inventario" set "Cantidad" = "Cantidad" - cant where id = prod.id;

        insert into public."Ventas" ("ProductoId", "Producto", "Cantidad", "Monto", "Vendedor")
        values (prod.id, prod."Nombre", cant, prod."Precio" * cant, vendedor);
    end loop;
end;
$$;

-- elimina una venta registrada por error y regresa las piezas al inventario
create or replace function public.cancelar_venta(venta_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v record;
begin
    if not public.es_usuario_permitido() then
        raise exception 'Usuario no permitido';
    end if;

    delete from public."Ventas" where id = venta_id returning * into v;
    if not found then
        raise exception 'La venta ya no existe';
    end if;

    if v."ProductoId" is not null then
        update public."Inventario" set "Cantidad" = "Cantidad" + v."Cantidad" where id = v."ProductoId";
    end if;
end;
$$;

-- solo usuarios con sesion pueden ejecutar las funciones
revoke all on function public.registrar_venta(jsonb) from public, anon;
revoke all on function public.cancelar_venta(bigint) from public, anon;
grant execute on function public.registrar_venta(jsonb) to authenticated;
grant execute on function public.cancelar_venta(bigint) to authenticated;
