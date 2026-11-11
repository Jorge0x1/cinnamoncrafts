// utilidades para preparar la foto de perfil

export interface Recorte {
    // esquina superior izquierda y tamaño del cuadrado a recortar, en pixeles de la imagen original
    x: number;
    y: number;
    lado: number;
}

// recorta el cuadrado indicado y lo reduce para que pese poco (unos 30-60 KB)
export function recortarImagen(imagen: HTMLImageElement, recorte: Recorte, ladoSalida = 320): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = ladoSalida;
    canvas.height = ladoSalida;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.reject(new Error('No se pudo procesar la imagen'));

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imagen, recorte.x, recorte.y, recorte.lado, recorte.lado, 0, 0, ladoSalida, ladoSalida);

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))),
            'image/jpeg',
            0.85
        );
    });
}

export function cargarImagen(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const imagen = new Image();
        imagen.onload = () => resolve(imagen);
        imagen.onerror = () => reject(new Error('El archivo no es una imagen válida'));
        imagen.src = url;
    });
}
