import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatearMoneda, obtenerColorTextoParaFondo } from '../../utils/formatters';
import type { ResumenMesBalance } from '../../types';

interface TooltipEntry {
  name?: string;
  value?: number;
  fill?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
}

// TOOLTIP PERSONALIZADO PARA BARRAS (Al pasar el ratón)
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    // Ordenamos de mayor a menor para que el tooltip tenga más sentido y cuadre con lo que ves
    const sortedPayload = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    
    return (
      <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800/80 z-50 min-w-[200px]">
        <p className="font-bold text-neutral-800 dark:text-white mb-3 text-sm border-b border-neutral-100 dark:border-neutral-800 pb-2">{label}</p>
        <div className="space-y-2.5">
          {sortedPayload.map((entry, index: number) => {
             const valor = entry.value ?? 0;
             const bgColor = entry.fill || '#94a3b8';
             const textColor = obtenerColorTextoParaFondo(bgColor);
             if(valor === 0) return null; // No saturar el tooltip si ese mes no hubo gasto en esa categoría
             return (
               <div key={index} className="flex justify-between items-center gap-6 text-sm">
                 <span 
                   className="px-2 py-0.5 rounded text-[11px] font-bold shadow-sm border border-black/10"
                   style={{ backgroundColor: bgColor, color: textColor }}
                 >
                   {entry.name}
                 </span>
                 <span className="font-bold text-neutral-900 dark:text-white">
                   {formatearMoneda(valor)} €
                 </span>
               </div>
             )
          })}
        </div>
      </div>
    );
  }
  return null;
};

interface LegendEntry {
  value?: string | number;
  color?: string;
}

interface CustomLegendProps {
  payload?: readonly LegendEntry[];
}

// LEYENDA PERSONALIZADA DE LA GRÁFICA
const CustomLegend = ({ payload }: CustomLegendProps) => {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap gap-2 justify-center pt-6">
      {payload.map((entry, index: number) => {
        const bgColor = entry.color || '#94a3b8';
        const textColor = obtenerColorTextoParaFondo(bgColor);
        return (
          <span 
            key={`item-${index}`} 
            className="px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm border border-black/10"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            {entry.value}
          </span>
        );
      })}
    </div>
  );
};

interface GraficoBalanceApiladoProps {
  resumenMensual: ResumenMesBalance[];
  coloresCategorias: Record<string, string>;
  ordenCategorias?: Record<string, number>;
  dataKeyPrefix: 'categoriasGastos' | 'categoriasIngresos';
}

export default function GraficoBalanceApilado({ resumenMensual, coloresCategorias, ordenCategorias, dataKeyPrefix }: GraficoBalanceApiladoProps) {
  const categoriasUnicas = new Set<string>();
  resumenMensual.forEach((mes) => {
    Object.keys(mes[dataKeyPrefix] || {}).forEach(cat => categoriasUnicas.add(cat));
  });
  
  const categorias = Array.from(categoriasUnicas).sort(
    (a, b) => (ordenCategorias?.[a] ?? 0) - (ordenCategorias?.[b] ?? 0)
  );

  const dataAplanada = resumenMensual.map((mes) => {
    const aplanado: Record<string, string | number> = { mes: mes.mes };
    categorias.forEach(cat => { aplanado[cat] = mes[dataKeyPrefix]?.[cat] || 0; });
    return aplanado;
  });

  return (
    <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800/80 rounded-2xl shadow-sm p-6 w-full h-[600px]">
      <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-6 uppercase tracking-wider">Desglose Mensual Acumulado</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dataAplanada} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" className="dark:stroke-neutral-800/50" />
          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(v) => `${v}€`} />
          
          {/* Aquí inyectamos nuestros componentes personalizados para Tooltip y Legend */}
          <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          
          {categorias.map((cat) => (
            <Bar key={cat} dataKey={cat} stackId="a" fill={coloresCategorias[cat] || '#888'} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}