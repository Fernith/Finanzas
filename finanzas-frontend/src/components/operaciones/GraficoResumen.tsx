import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';
import { formatearMoneda, obtenerColorTextoParaFondo } from '../../utils/formatters';

interface PieTooltipEntry {
  name?: string;
  value?: number;
  payload?: { fill?: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly PieTooltipEntry[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const bgColor = data.payload?.fill || '#94a3b8';
    const textColor = obtenerColorTextoParaFondo(bgColor);
    return (
      <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800/80 z-50 flex items-center gap-4">
        <span 
           className="px-2 py-0.5 rounded text-xs font-bold shadow-sm border border-black/10"
           style={{ backgroundColor: bgColor, color: textColor }}
        >
           {data.name}
        </span>
        <span className="font-bold text-neutral-900 dark:text-white">{formatearMoneda(data.value ?? 0)} €</span>
      </div>
    );
  }
  return null;
};

type GraficoProps = {
  titulo: string;
  datosGrafico: { name: string; value: number; fill: string }[];
  colorBorderTheme?: string; 
  mensajeVacio: string;
};

export default function GraficoResumen({ titulo, datosGrafico, colorBorderTheme = "dark:border-neutral-800", mensajeVacio }: GraficoProps) {
  return (
    <div className={`bg-white dark:bg-neutral-900 border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-full transition-colors ${colorBorderTheme}`}>
      <h3 className="text-sm font-bold text-slate-800 dark:text-neutral-300 mb-4 uppercase tracking-wider">{titulo}</h3>
      
      {datosGrafico.length > 0 ? (
        <>
          <div className="w-full min-w-0 mb-4 shrink-0">
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie 
                  data={datosGrafico} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value" 
                  stroke="none" 
                  label={({ percent }) => percent !== undefined ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false} 
                />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-3 flex-1 pr-1">
            {datosGrafico.map((item) => {
              const textColor = obtenerColorTextoParaFondo(item.fill);
              return (
                <div key={item.name} className="flex justify-between items-center text-sm">
                  <span 
                    className="px-2 py-1 rounded text-[11px] font-bold shadow-sm border border-black/10 truncate max-w-[140px]" 
                    style={{ backgroundColor: item.fill, color: textColor }}
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold">{formatearMoneda(item.value)} €</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
         <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">{mensajeVacio}</div>
      )}
    </div>
  );
}