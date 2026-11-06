import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatearMoneda } from '../../utils/formatters';

type Props = {
  flujoMensual: { mes: string, cantidad: number }[];
};

export default function GraficoFlujoInversiones({ flujoMensual }: Props) {
  
  // Formateamos el mes de 'YYYY-MM' a algo más legible como 'Ene 24'
  const datosFormateados = useMemo(() => {
    const mesesTexto = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return flujoMensual.map(d => {
      const [year, month] = d.mes.split('-');
      const mesNombre = mesesTexto[parseInt(month, 10) - 1];
      return { ...d, mesLegible: `${mesNombre} ${year.slice(2)}` };
    });
  }, [flujoMensual]);

  if (datosFormateados.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex items-center justify-center h-64">
        <p className="text-neutral-400">No hay datos suficientes para mostrar la gráfica de flujo.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-neutral-800 dark:text-white">Flujo de Inversión Mensual</h2>
        <p className="text-sm text-neutral-500">Capital aportado mes a mes</p>
      </div>
      
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datosFormateados} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorInvertido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" className="dark:stroke-neutral-800" />
            <XAxis 
              dataKey="mesLegible" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#888888' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#888888' }}
              tickFormatter={(val) => `${val}€`}
            />
            <Tooltip 
              formatter={(value) => [`${formatearMoneda(Number(value ?? 0))} €`, 'Invertido']}
              labelFormatter={(label) => `Mes: ${label}`}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area 
              type="monotone" 
              dataKey="cantidad" 
              stroke="#4f46e5" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorInvertido)" 
              activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}