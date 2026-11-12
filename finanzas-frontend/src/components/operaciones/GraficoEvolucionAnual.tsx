import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { formatearMoneda, obtenerColorTextoParaFondo } from '../../utils/formatters';
import type { BarraMesOperacion } from '../../types';

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

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    return (
      <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800/80 z-50 min-w-[200px]">
        <p className="font-bold text-neutral-800 dark:text-white mb-3 text-sm border-b border-neutral-100 dark:border-neutral-800 pb-2">{label}</p>
        <div className="space-y-2.5">
          {sortedPayload.map((entry, index: number) => {
            const valor = entry.value ?? 0;
            const bgColor = entry.fill || '#94a3b8';
            const textColor = obtenerColorTextoParaFondo(bgColor);
            if (valor === 0) return null;
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
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

type Props = {
  data: BarraMesOperacion[];
  categorias: { nombre: string; color: string; orden?: number }[];
  tipo: 'GASTO' | 'INGRESO';
  colorBorderTheme: string;
};

export default function GraficoEvolucionAnual({ data, categorias, tipo, colorBorderTheme }: Props) {
  const nombreOperacion = tipo === 'GASTO' ? 'Gastos' : 'Ingresos';
  const categoriasOrdenadas = [...categorias].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  return (
    <div className={`bg-white dark:bg-neutral-900 border rounded-2xl p-6 shadow-sm transition-colors ${colorBorderTheme}`}>
      <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-6 uppercase tracking-wider">
        Evolución de {nombreOperacion} Anuales
      </h3>
      <div className="w-full min-w-0">
        <ResponsiveContainer width="100%" height={288}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" className="dark:stroke-neutral-800" />
            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(v) => `${v}€`} />
            <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<CustomTooltip />} />
            {/* Generamos una barra apilada por cada categoría dinámicamente */}
            {categoriasOrdenadas.map((cat) => (
              <Bar key={cat.nombre} dataKey={cat.nombre} stackId="a" fill={cat.color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}