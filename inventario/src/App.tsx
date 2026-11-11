import { useSesion } from './hooks';
import { Login, Panel, ToastProvider } from './components';
import './App.css';

// componente raiz
// decide que mostrar segun la sesion: inicio de sesion o el panel principal

function App() {
    const { estado, usuario, iniciarSesion, cerrarSesion } = useSesion();

    return (
        <ToastProvider>
            {estado === 'cargando' && <p className="cargando-app">Cargando…</p>}
            {(estado === 'sin-sesion' || estado === 'no-permitido') && (
                <Login onEntrar={iniciarSesion} noPermitido={estado === 'no-permitido'} />
            )}
            {estado === 'listo' && <Panel usuario={usuario} onSalir={() => void cerrarSesion()} />}
        </ToastProvider>
    );
}

export default App;
