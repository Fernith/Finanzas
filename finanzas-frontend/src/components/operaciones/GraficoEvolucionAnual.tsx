import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { formatearMoneda } from '../../utils/formatters';
import type { BarraMesOperacion } from '../../types';

type Props = {
  data: BarraMesOperacion[];
  categorias: { nombre: string; color: string }[];
  tipo: 'GASTO' | 'INGRESO';
  colorBorderTheme: string;
};

export default function GraficoEvolucionAnual({ data, categorias, tipo, colorBorderTheme }: Props) {
  const nombreOperacion = tipo === 'GASTO' ? 'Gastos' : 'Ingresos';

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
            <RechartsTooltip 
              formatter={(v, name) => [`${formatearMoneda(Number(v ?? 0))} €`, String(name ?? '')]} 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
            />
            {/* Generamos una barra apilada por cada categoría dinámicamente */}
            {categorias.map((cat) => (
              <Bar key={cat.nombre} dataKey={cat.nombre} stackId="a" fill={cat.color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}