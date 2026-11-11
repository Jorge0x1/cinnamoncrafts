import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

// manejo de sesion con supabase auth
// el usuario escribe su nombre de usuario; la cuenta en supabase usa <usuario>@cinnamoncrafts.app
// quien puede entrar lo decide la tabla Usuarios en la base de datos (no el codigo)

const DOMINIO_CORREO = 'cinnamoncrafts.app';

export type EstadoSesion = 'cargando' | 'sin-sesion' | 'no-permitido' | 'listo';

function useSesion() {
    const [estado, setEstado] = useState<EstadoSesion>('cargando');
    const [usuario, setUsuario] = useState('');

    useEffect(() => {
        const verificar = async (session: Session | null) => {
            if (!session) {
                setUsuario('');
                setEstado('sin-sesion');
                return;
            }
            const { data, error } = await supabase
                .from('Usuarios')
                .select('Usuario')
                .eq('id', session.user.id)
                .maybeSingle();
            if (error || !data) {
                setUsuario('');
                setEstado('no-permitido');
                return;
            }
            setUsuario(data.Usuario as string);
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

    return { estado, usuario, iniciarSesion, cerrarSesion };
}

export default useSesion;
