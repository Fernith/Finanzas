export const redondearMoneda = (valor: number): number => {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
};

export const formatearMoneda = (valor: number) => {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(redondearMoneda(valor));
};

export const obtenerFechaHoyEsp = (): string => {
  const partes = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const anio = partes.find(p => p.type === 'year')?.value ?? '';
  const mes = partes.find(p => p.type === 'month')?.value ?? '';
  const dia = partes.find(p => p.type === 'day')?.value ?? '';
  return `${anio}-${mes}-${dia}`;
};

// NUEVA FUNCIÓN: Devuelve '#FFFFFF' o '#000000' dependiendo del brillo del fondo
export const obtenerColorTextoParaFondo = (hexColor: string) => {
  if (!hexColor) return '#ffffff'; // Blanco por defecto si no hay color
  
  // Limpiamos el # si lo trae
  const hex = hexColor.replace('#', '');
  
  // Convertimos a RGB (soporta HEX de 3 o 6 dígitos)
  const r = parseInt(hex.length === 3 ? hex.slice(0, 1).repeat(2) : hex.slice(0, 2), 16);
  const g = parseInt(hex.length === 3 ? hex.slice(1, 2).repeat(2) : hex.slice(2, 4), 16);
  const b = parseInt(hex.length === 3 ? hex.slice(2, 3).repeat(2) : hex.slice(4, 6), 16);
  
  // Fórmula YIQ para calcular la luminancia percibida por el ojo humano
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Si el valor es mayor o igual a 128 el color es claro -> devolvemos texto negro.
  // Si es menor el color es oscuro -> devolvemos texto blanco.
  return (yiq >= 128) ? '#000000' : '#ffffff';
};