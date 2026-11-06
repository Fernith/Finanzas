import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { formatearMoneda } from '../../utils/formatters';
import type { BarraMediaCategoria } from '../../types';

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
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" className="dark:stroke-neutral-800" />
            <XAxis dataKey="categoria" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} interval={0} angle={-45} textAnchor="end" height={60} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(v) => `${v}€`} />
            <RechartsTooltip 
              formatter={(v) => [`${formatearMoneda(Number(v ?? 0))} €/mes`, 'Media']} 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
            />
            {/* El color se inyecta automáticamente gracias a la prop 'fill' de la data */}
            <Bar dataKey="Media" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}