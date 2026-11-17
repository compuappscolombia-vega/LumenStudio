import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Activity } from 'lucide-react';
import type { ProductionProject, ProductionSequence } from '../types/studio';
import { computeProductionRadarMetrics } from '../utils/productionProgress';

interface ProductionRadarChartProps {
  project: ProductionProject;
  activeSequence?: ProductionSequence | null;
}

interface AngleTickProps {
  x?: number | string;
  y?: number | string;
  cx?: number | string;
  cy?: number | string;
  payload?: { value?: string | number };
}

function renderAngleTick({ x = 0, y = 0, cx = 0, cy = 0, payload }: AngleTickProps) {
  const label = String(payload?.value ?? '');
  const numX = Number(x) || 0;
  const numY = Number(y) || 0;
  const numCx = Number(cx) || 0;
  const numCy = Number(cy) || 0;
  const dx = numX - numCx;
  const dy = numY - numCy;
  const textAnchor = Math.abs(dx) < 8 ? 'middle' : dx > 0 ? 'start' : 'end';
  const offsetX = Math.abs(dx) < 8 ? 0 : dx > 0 ? 6 : -6;
  const offsetY = Math.abs(dy) < 8 ? 0 : dy > 0 ? 8 : -6;

  const words = label.split(' ');
  const lines =
    label.length > 14 && words.length >= 2
      ? [words.slice(0, -1).join(' '), words[words.length - 1]]
      : [label];

  return (
    <text
      x={numX + offsetX}
      y={numY + offsetY}
      textAnchor={textAnchor}
      fill="#E6E2DA"
      fontSize={11.5}
      fontWeight={500}
      dominantBaseline="central"
    >
      {lines.map((line, index) => (
        <tspan
          key={`${label}-${index}`}
          x={numX + offsetX}
          dy={index === 0 ? (lines.length > 1 ? -6 : 0) : 13}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function ProductionRadarChart({
  project,
  activeSequence,
}: ProductionRadarChartProps) {
  const report = computeProductionRadarMetrics(project, activeSequence);
  const showComparison = report.sequencesCount > 1 && Boolean(activeSequence);

  const chartData = report.axes.map((item) => ({
    subject: item.axis,
    proyecto: item.projectScore,
    secuencia: item.sequenceScore,
    detail: item.detailSummary,
  }));

  return (
    <section
      aria-labelledby="production-radar-heading"
      className="rounded-xl border border-white/10 bg-[#121218] p-5 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#E5A93C] shrink-0" />
          <div>
            <h3
              id="production-radar-heading"
              className="font-display text-sm font-semibold text-[#F2F0EB]"
            >
              Progreso de Producción del Proyecto
            </h3>
            <p className="text-xs text-[#8D8981] mt-0.5">
              Nivel de detalle en guion, diseño de iluminación, efectos visuales y diseño sonoro.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono-tech text-[#9A968E] tabular-nums">
          <span>
            Índice global:{' '}
            <strong className="text-[#E5A93C] font-semibold">
              {report.overallProjectScore}%
            </strong>
          </span>
          <span aria-hidden="true" className="text-white/20">
            ·
          </span>
          <span>
            {report.sequencesCount}{' '}
            {report.sequencesCount === 1 ? 'secuencia' : 'secuencias'}
          </span>
          <span aria-hidden="true" className="text-white/20">
            ·
          </span>
          <span>
            {report.finalCount} {report.finalCount === 1 ? 'final' : 'finales'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Recharts Radar Canvas */}
        <div className="lg:col-span-7 h-[280px] sm:h-[310px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="60%"
              margin={{ top: 20, right: 44, bottom: 20, left: 44 }}
              data={chartData}
            >
              <PolarGrid stroke="rgba(255,255,255,0.12)" />
              <PolarAngleAxis dataKey="subject" tick={renderAngleTick} tickLine={false} />
              <PolarRadiusAxis
                angle={45}
                domain={[0, 100]}
                tickCount={5}
                tick={{ fill: '#7D7971', fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="Proyecto activo (%)"
                dataKey="proyecto"
                stroke="#E5A93C"
                strokeWidth={2}
                fill="#E5A93C"
                fillOpacity={0.28}
              />
              {showComparison && (
                <Radar
                  name="Secuencia activa (%)"
                  dataKey="secuencia"
                  stroke="#38B2AC"
                  strokeWidth={2}
                  fill="#38B2AC"
                  fillOpacity={0.18}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B0B0E',
                  borderColor: 'rgba(255,255,255,0.14)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#F2F0EB',
                }}
                formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
              />
              {showComparison && (
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#C8C3BA', paddingTop: '6px' }}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabular Breakdown */}
        <div className="lg:col-span-5 divide-y divide-white/8 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-6">
          {report.axes.map((item) => (
            <div key={item.key} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#F2F0EB]">{item.axis}</span>
                <span className="text-xs font-mono-tech font-semibold text-[#E5A93C] tabular-nums">
                  {item.projectScore}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#E5A93C] transition-all duration-300"
                  style={{ width: `${item.projectScore}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#8D8981] font-mono-tech tabular-nums">
                <span className="truncate">{item.detailSummary}</span>
                {showComparison && (
                  <span className="text-[#5EEAD4] shrink-0">
                    Sec: {item.sequenceScore}%
                  </span>
                )}
              </div>
            </div>
          ))}

          {!report.hasContent && (
            <p className="pt-3 text-xs text-[#9A968E] leading-relaxed">
              Produce tu primera secuencia desde un capítulo, audio o historia para ver la
              cobertura técnica en el radar.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
