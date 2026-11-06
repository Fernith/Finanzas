import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatearMoneda } from '../../utils/formatters';
import type { ResumenMesBalance } from '../../types';

type Props = { resumenMensual: ResumenMesBalance[]; };

export default function GraficoBalanceEvolutivo({ resumenMensual }: Props) {
  const customTooltipFormatter = (value: number | string | readonly (number | string)[] | undefined) => [
    `${formatearMoneda(Number(value ?? 0))} €`,
  ];

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-blue-500/30 rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Evolución de Ingresos vs Gastos</h2>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={resumenMensual} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `${val}€`} width={60} />
            <Tooltip formatter={customTooltipFormatter} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#171717', borderColor: '#404040', color: '#fff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Line name="Ingresos" type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            <Line name="Gastos" type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}