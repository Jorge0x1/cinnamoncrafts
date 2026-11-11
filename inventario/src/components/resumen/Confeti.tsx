import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import './Confeti.css';

// explosion de confeti que se reproduce una vez al montarse y luego desaparece
// se coloca dentro de un contenedor con position: relative

const COLORES = ['#A1CAFF', '#FBAED2', '#FFE27A', '#B9F3C9', '#D7B8FF', '#FF9DB8'];
const PIEZAS = 46;
const DURACION_MS = 3200;

interface Pieza {
    id: number;
    estilo: CSSProperties;
    redonda: boolean;
}

function crearPiezas(): Pieza[] {
    return Array.from({ length: PIEZAS }, (_, i) => {
        const angulo = Math.random() * Math.PI - Math.PI; // hacia arriba, en abanico
        const fuerza = 70 + Math.random() * 110;
        return {
            id: i,
            redonda: Math.random() < 0.3,
            estilo: {
                '--dx': `${Math.cos(angulo) * fuerza * 1.6}px`,
                '--dy': `${Math.sin(angulo) * fuerza}px`,
                '--caida': `${90 + Math.random() * 90}px`,
                '--giro': `${(Math.random() - 0.5) * 1080}deg`,
                '--color': COLORES[i % COLORES.length],
                '--tam': `${6 + Math.random() * 6}px`,
                animationDelay: `${Math.random() * 0.15}s`,
                animationDuration: `${2.2 + Math.random() * 0.9}s`,
            } as CSSProperties,
        };
    });
}

function Confeti() {
    const [piezas] = useState(crearPiezas);
    const [terminado, setTerminado] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setTerminado(true), DURACION_MS);
        return () => clearTimeout(t);
    }, []);

    if (terminado) return null;

    return (
        <div className="confeti" aria-hidden="true">
            {piezas.map((p) => (
                <span key={p.id} className={`confeti-pieza ${p.redonda ? 'redonda' : ''}`} style={p.estilo} />
            ))}
        </div>
    );
}

export default Confeti;
