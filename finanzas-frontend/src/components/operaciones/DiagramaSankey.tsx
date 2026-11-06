import { ResponsiveContainer, Sankey, Layer, Rectangle, Tooltip as RechartsTooltip } from 'recharts';
import { formatearMoneda } from '../../utils/formatters';
import type { SankeyData } from '../../types';

interface SankeyNodeRenderProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: { name?: string; fill?: string };
  containerWidth?: number;
}

const renderSankeyNode = ({ x, y, width, height, index, payload, containerWidth = 0 }: SankeyNodeRenderProps) => {
  // Si el nodo está en la mitad derecha, anclamos el texto al final y lo ponemos a la izquierda de la barra
  const isOut = x > containerWidth / 2;
  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={payload.fill} fillOpacity={1} radius={4} />
      <text 
        x={isOut ? x - 8 : x + width + 8} 
        y={y + height / 2} 
        dy={4} 
        textAnchor={isOut ? 'end' : 'start'} 
        className="text-xs font-bold fill-neutral-700 dark:fill-neutral-300"
      >
        {payload.name}
      </text>
    </Layer>
  );
};

type Props = { data: SankeyData | null; titulo: string; mensajeVacio: string; colorBorderTheme: string; };

export default function DiagramaSankey({ data, titulo, mensajeVacio, colorBorderTheme }: Props) {
  return (
    <div className={`bg-white dark:bg-neutral-900 border rounded-2xl p-6 shadow-sm overflow-hidden h-full min-h-[400px] flex flex-col transition-colors ${colorBorderTheme}`}>
      <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-6 uppercase tracking-wider">{titulo}</h3>
      {data ? (
        <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {/* Margen aumentado a la derecha para que no corte los textos */}
            <Sankey data={data} node={renderSankeyNode} nodePadding={30} margin={{ left: 20, right: 100, top: 20, bottom: 20 }} link={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}>
              <RechartsTooltip formatter={(value) => [`${formatearMoneda(Number(value ?? 0))} €`, 'Flujo']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            </Sankey>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-neutral-400 text-sm mt-10">{mensajeVacio}</div>
      )}
    </div>
  );
}