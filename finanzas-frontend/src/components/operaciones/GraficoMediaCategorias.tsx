import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { formatearMoneda, obtenerColorTextoParaFondo } from '../../utils/formatters';
import type { BarraMediaCategoria } from '../../types';

interface MediaTooltipEntry {
  value?: number;
  payload?: { categoria?: string; fill?: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly MediaTooltipEntry[];
  label?: string | number;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    const valor = Number(entry.value ?? 0);
    const nombreCat = entry.payload?.categoria || String(label ?? '');
    const bgColor = entry.payload?.fill || '#94a3b8';
    const textColor = obtenerColorTextoParaFondo(bgColor);

    return (
      <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800/80 z-50 flex items-center gap-4">
        <span
          className="px-2 py-0.5 rounded text-xs font-bold shadow-sm border border-black/10"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {nombreCat}
        </span>
        <span className="font-bold text-neutral-900 dark:text-white text-sm">
          {formatearMoneda(valor)} €/mes
        </span>
      </div>
    );
  }
  return null;
};

type Props = {
  data: BarraMediaCategoria[];
  colorBorderTheme: string;
};

export default function GraficoMediaCategorias({ data, colorBorderTheme }: Props) {
  return (
    <div className={`bg-white dark:bg-neutral-900 border rounded-2xl p-6 shadow-sm transition-colors ${colorBorderTheme}`}>
      <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-6 uppercase tracking-wider">
        Media Mensual por Categoría
      </h3>
      <div className="w-full min-w-0">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" className="dark:stroke-neutral-800" />
            <XAxis dataKey="categoria" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} interval={0} angle={-45} textAnchor="end" height={60} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(v) => `${v}€`} />
            <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<CustomTooltip />} />
            {/* El color se inyecta automáticamente gracias a la prop 'fill' de la data */}
            <Bar dataKey="Media" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}