import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

// manejo de sesion con supabase auth
// el usuario escribe su nombre de usuario; la cuenta en supabase usa <usuario>@cinnamoncrafts.app
// quien puede entrar lo decide la tabla Usuarios en la base de datos (no el codigo)

const DOMINIO_CORREO = 'cinnamoncrafts.app';
const BUCKET_FOTOS = 'avatares';

export type EstadoSesion = 'cargando' | 'sin-sesion' | 'no-permitido' | 'listo';

function useSesion() {
    const [estado, setEstado] = useState<EstadoSesion>('cargando');
    const [usuario, setUsuario] = useState('');
    const [usuarioId, setUsuarioId] = useState<string | null>(null);
    const [foto, setFoto] = useState<string | null>(null);

    useEffect(() => {
        const verificar = async (session: Session | null) => {
            if (!session) {
                setUsuario('');
                setUsuarioId(null);
                setFoto(null);
                setEstado('sin-sesion');
                return;
            }
            const { data, error } = await supabase
                .from('Usuarios')
                .select('Usuario, Foto')
                .eq('id', session.user.id)
                .maybeSingle();
            if (error || !data) {
                setUsuario('');
                setEstado('no-permitido');
                return;
            }
            setUsuario(data.Usuario as string);
            setUsuarioId(session.user.id);
            setFoto((data.Foto as string | null) ?? null);
            setEstado('listo');
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, session) => {
            if (evento === 'INITIAL_SESSION' || evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') {
                // supabase recomienda no hacer consultas directamente dentro de este callback
                setTimeout(() => void verificar(session), 0);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const iniciarSesion = useCallback(async (nombreUsuario: string, contrasena: string): Promise<string | null> => {
        const correo = `${nombreUsuario.trim().toLowerCase()}@${DOMINIO_CORREO}`;
        const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
        if (!error) return null;
        if (error.message.toLowerCase().includes('invalid')) return 'Usuario o contraseña incorrectos';
        return 'No se pudo iniciar sesión, revisa tu conexión';
    }, []);

    const cerrarSesion = useCallback(async () => {
        await supabase.auth.signOut();
    }, []);

    // sube una nueva foto de perfil (ya recortada); regresa null si salio bien o el mensaje de error
    const cambiarFoto = useCallback(async (imagen: Blob): Promise<string | null> => {
        if (!usuarioId) return 'No hay sesión iniciada';

        // nombre unico para que el navegador no muestre la foto anterior guardada en cache
        const ruta = `${usuarioId}/${Date.now()}.jpg`;
        const almacen = supabase.storage.from(BUCKET_FOTOS);

        const { error: errorSubida } = await almacen.upload(ruta, imagen, { contentType: 'image/jpeg' });
        if (errorSubida) return errorSubida.message;

        const { data: { publicUrl } } = almacen.getPublicUrl(ruta);
        const { error: errorGuardar } = await supabase.rpc('actualizar_foto', { url: publicUrl });
        if (errorGuardar) {
            await almacen.remove([ruta]);
            return errorGuardar.message;
        }

        // borrar la foto anterior para no acumular archivos
        const marcador = `/${BUCKET_FOTOS}/`;
        if (foto?.includes(marcador)) {
            await almacen.remove([foto.split(marcador)[1]]);
        }

        setFoto(publicUrl);
        return null;
    }, [usuarioId, foto]);

    return { estado, usuario, foto, iniciarSesion, cerrarSesion, cambiarFoto };
}

export default useSesion;
