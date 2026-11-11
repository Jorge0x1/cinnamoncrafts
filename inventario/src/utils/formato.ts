// utilidades de formato compartidas

const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

// $1,250.00
export const formatoMoneda = (valor: number) => moneda.format(valor);

// minusculas y sin acentos, para buscar "nudo" y encontrar "Nudo"
export const normalizar = (texto: string) =>
    texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
