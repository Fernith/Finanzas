import DiagramaSankey from './DiagramaSankey';
import GraficoEvolucionAnual from './GraficoEvolucionAnual';
import GraficoMediaCategorias from './GraficoMediaCategorias';
import type { BarraMediaCategoria, BarraMesOperacion, SankeyData } from '../../types';

type Props = { 
  barrasMesAMes: BarraMesOperacion[]; 
  barrasMediaCategorias: BarraMediaCategoria[]; 
  sankeyAnual: SankeyData | null; 
  year: number; 
  tipo: 'GASTO' | 'INGRESO';
  categorias: { nombre: string; color: string }[];
};

export default function VistaAnualOperaciones({ barrasMesAMes, barrasMediaCategorias, sankeyAnual, year, tipo, categorias }: Props) {
  const nombreOperacion = tipo === 'GASTO' ? 'Gastos' : 'Ingresos';
  const colorBorderTheme = tipo === 'GASTO' ? 'dark:border-red-500/30 border-red-200' : 'dark:border-emerald-500/30 border-emerald-200';

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      
      <GraficoEvolucionAnual 
        data={barrasMesAMes} 
        categorias={categorias} 
        tipo={tipo} 
        colorBorderTheme={colorBorderTheme} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoMediaCategorias 
          data={barrasMediaCategorias} 
          colorBorderTheme={colorBorderTheme} 
        />

        <DiagramaSankey 
          data={sankeyAnual} 
          titulo={`Flujo de ${nombreOperacion} (${year})`} 
          mensajeVacio="No hay datos suficientes para el diagrama." 
          colorBorderTheme={colorBorderTheme} 
        />
      </div>
    </div>
  );
}