import { ResponsiveContainer, Sankey, Layer, Rectangle, Tooltip as RechartsTooltip } from 'recharts';
import { formatearMoneda, obtenerColorTextoParaFondo } from '../../utils/formatters';
import type { SankeyData } from '../../types';

interface SankeyTooltipPayloadItem {
  name?: string;
  value?: number;
  payload?: {
    fill?: string;
    payload?: {
      fill?: string;
      source?: { name?: string; fill?: string };
      target?: { name?: string; fill?: string };
    };
  };
}

interface CustomSankeyTooltipProps {
  active?: boolean;
  payload?: readonly SankeyTooltipPayloadItem[];
}

const CustomSankeyTooltip = ({ active, payload }: CustomSankeyTooltipProps) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    const valor = Number(entry.value ?? 0);
    const nombreLimpio = String(entry.name ?? 'Flujo').replace(/ - (Gastos|Ingresos)$/, '');
    const inner = entry.payload?.payload;
    const bgColor = inner?.source?.fill || inner?.fill || entry.payload?.fill || '#94a3b8';
    const textColor = obtenerColorTextoParaFondo(bgColor);

    return (
      <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800/80 z-50 flex items-center gap-4">
        <span
          className="px-2 py-0.5 rounded text-xs font-bold shadow-sm border border-black/10"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {nombreLimpio}
        </span>
        <span className="font-bold text-neutral-900 dark:text-white text-sm">
          {formatearMoneda(valor)} €
        </span>
      </div>
    );
  }
  return null;
};

interface SankeyNodeRenderProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: { name?: string; fill?: string };
  containerWidth?: number;
}

const renderSankeyNode = ({ x, y, width, height, index, payload }: SankeyNodeRenderProps) => {
  // Los nodos origen (categorías) están a la izquierda (x cercano al margen izquierdo) y el nodo destino a la derecha
  const esNodoDerecho = x > 100;
  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={payload.fill} fillOpacity={1} radius={4} />
      <text 
        x={esNodoDerecho ? x - 8 : x + width + 8} 
        y={y + height / 2} 
        dy={4} 
        textAnchor={esNodoDerecho ? 'end' : 'start'} 
        className="text-xs font-bold fill-neutral-700 dark:fill-neutral-300"
      >
        {payload.name}
      </text>
    </Layer>
  );
};

type Props = { data: SankeyData | null; titulo: string; mensajeVacio: string; colorBorderTheme: string; };

export default function DiagramaSankey({ data, titulo, mensajeVacio, colorBorderTheme }: Props) {
  const numCategorias = data ? Math.max(1, data.nodes.length - 1) : 1;
  const nodePadding = numCategorias > 12 ? 8 : numCategorias > 8 ? 12 : numCategorias > 5 ? 18 : 26;
  const alturaMinima = Math.max(300, numCategorias * 26);

  return (
    <div className={`bg-white dark:bg-neutral-900 border rounded-2xl p-6 shadow-sm overflow-hidden h-full min-h-[400px] flex flex-col transition-colors ${colorBorderTheme}`}>
      <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-6 uppercase tracking-wider">{titulo}</h3>
      {data ? (
        <div className="flex-1 w-full min-w-0 flex items-center">
          <ResponsiveContainer width="100%" height={alturaMinima}>
            <Sankey data={data} node={renderSankeyNode} nodePadding={nodePadding} margin={{ left: 10, right: 10, top: 15, bottom: 15 }} link={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}>
              <RechartsTooltip content={<CustomSankeyTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-neutral-400 text-sm mt-10">{mensajeVacio}</div>
      )}
    </div>
  );
}