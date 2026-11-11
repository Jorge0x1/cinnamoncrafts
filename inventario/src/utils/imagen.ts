// prepara una foto para usarla de perfil:
// recorta al centro en cuadrado y la reduce para que pese poco (unos 30-60 KB)

export async function prepararFotoPerfil(archivo: File, lado = 320): Promise<Blob> {
    const url = URL.createObjectURL(archivo);
    try {
        const imagen = await cargarImagen(url);
        const corte = Math.min(imagen.naturalWidth, imagen.naturalHeight);
        const x = (imagen.naturalWidth - corte) / 2;
        const y = (imagen.naturalHeight - corte) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = lado;
        canvas.height = lado;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No se pudo procesar la imagen');
        ctx.drawImage(imagen, x, y, corte, corte, 0, 0, lado, lado);

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))),
                'image/jpeg',
                0.85
            );
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

function cargarImagen(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const imagen = new Image();
        imagen.onload = () => resolve(imagen);
        imagen.onerror = () => reject(new Error('El archivo no es una imagen válida'));
        imagen.src = url;
    });
}
