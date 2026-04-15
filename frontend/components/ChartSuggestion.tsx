import { useMemo } from "react";
import { SuggestedChart } from "./types";
import { AppIcon } from "./AppIcon";

interface ChartSuggestionProps {
  chart: SuggestedChart;
  data: Record<string, unknown>[];
}

export function ChartSuggestion({ chart, data }: ChartSuggestionProps) {
  const chartData = useMemo(() => {
    if (!chart.x_field || !chart.y_field || data.length === 0) {
      return [];
    }

    if (chart.group_by) {
      const grouped: Record<string, any> = {};
      data.forEach((row) => {
        const groupKey = String(row[chart.group_by!] || "Other");
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(row);
      });

      return Object.entries(grouped).map(([key, rows]: [string, any[]]) => ({
        name: key,
        values: rows.map((r: Record<string, unknown>) => ({
          x: String(r[chart.x_field!]),
          y: Number(r[chart.y_field!]) || 0,
        })),
      }));
    }

    return [
      {
        name: chart.y_field,
        values: data.map((row) => ({
          x: String(row[chart.x_field!]),
          y: Number(row[chart.y_field!]) || 0,
        })),
      },
    ];
  }, [chart, data]);

  const renderChart = () => {
    if (chart.type === "none") return null;

    if (chart.type === "table") {
      return <TableChartView data={data} />;
    }

    if (chartData.length === 0 || !chartData[0]?.values || chartData[0].values.length === 0) {
      return (
        <div className="text-center py-8 text-zinc-400">
          No se pudieron generar los datos para la gráfica
        </div>
      );
    }

    if (chart.type === "line") {
      return <LineChartSVG data={chartData} xLabel={chart.x_axis_label} yLabel={chart.y_axis_label} />;
    }

    if (chart.type === "bar") {
      return <BarChartSVG data={chartData} xLabel={chart.x_axis_label} yLabel={chart.y_axis_label} />;
    }

    if (chart.type === "horizontal_bar") {
      return <HorizontalBarChartSVG data={chartData} xLabel={chart.x_axis_label} yLabel={chart.y_axis_label} />;
    }

    if (chart.type === "stacked_bar") {
      return <StackedBarChartSVG data={chartData} xLabel={chart.x_axis_label} yLabel={chart.y_axis_label} />;
    }

    if (chart.type === "pie") {
      return <PieChartSVG data={chartData} yLabel={chart.y_axis_label} />;
    }

    if (chart.type === "donut") {
      return <PieChartSVG data={chartData} yLabel={chart.y_axis_label} innerRadius={0.52} />;
    }

    if (chart.type === "area") {
      return <LineChartSVG data={chartData} xLabel={chart.x_axis_label} yLabel={chart.y_axis_label} filled />;
    }

    if (chart.type === "scatter") {
      return <ScatterChartSVG data={chartData} xLabel={chart.x_axis_label} yLabel={chart.y_axis_label} />;
    }

    if (chart.type === "heatmap") {
      return <HeatmapChartSVG rawData={data} chart={chart} />;
    }

    if (chart.type === "combo") {
      return <ComboChartSVG data={chartData} xLabel={chart.x_axis_label} yLabel={chart.y_axis_label} />;
    }

    return (
      <div className="text-center py-8 text-zinc-400">
        Tipo de gráfica "{chart.type}" no soportado aún
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-7 w-7 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
          <AppIcon name="bar_chart" className="h-[16px] w-[16px]" />
        </div>
        <div className="space-y-1">
          <h4 className="text-[14px] font-semibold text-sky-200">{chart.title}</h4>
          {chart.description && (
            <p className="text-[12px] text-zinc-300">{chart.description}</p>
          )}
          {chart.filtered_rows_count && (
            <p className="text-[11px] text-zinc-400">
              Datos mostrados: {chart.filtered_rows_count} registros
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/70 p-4 overflow-x-auto">
        {renderChart()}
      </div>
    </div>
  );
}

function LineChartSVG({
  data,
  xLabel,
  yLabel,
  filled = false,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  xLabel?: string;
  yLabel?: string;
  filled?: boolean;
}) {
  const width = 640;
  const height = 300;
  const paddingLeft = 58;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 62;

  const allValues = data.flatMap((d) => d.values.map((v) => v.y));
  const maxY = Math.max(...allValues, 1);
  const minY = 0;

  const xCount = data[0]?.values.length || 1;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const xStep = chartWidth / (xCount - 1 || 1);
  const yRange = maxY - minY || 1;
  const yScale = chartHeight / yRange;

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f97316"];
  const xValues = data[0]?.values.map((v) => v.x) ?? [];
  const tickIndices = getTickIndices(xValues.length, 6);

  return (
    <svg width="100%" height="300" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={`grid-${ratio}`}
          x1={paddingLeft}
          y1={height - paddingBottom - ratio * chartHeight}
          x2={width - paddingRight}
          y2={height - paddingBottom - ratio * chartHeight}
          stroke="#27272a"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis */}
      <line
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={height - paddingBottom}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* X-axis */}
      <line
        x1={paddingLeft}
        y1={height - paddingBottom}
        x2={width - paddingRight}
        y2={height - paddingBottom}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <text
          key={`y-label-${ratio}`}
          x={paddingLeft - 10}
          y={height - paddingBottom - ratio * chartHeight + 4}
          fontSize="11"
          fill="#9ca3af"
          textAnchor="end"
        >
          {formatAxisValue(minY + ratio * yRange, yLabel)}
        </text>
      ))}

      {/* X-axis ticks */}
      {tickIndices.map((idx) => {
        const x = paddingLeft + idx * xStep;
        return (
          <g key={`x-tick-${idx}`}>
            <line
              x1={x}
              y1={height - paddingBottom}
              x2={x}
              y2={height - paddingBottom + 5}
              stroke="#71717a"
              strokeWidth="1"
            />
            <text
              x={x}
              y={height - paddingBottom + 18}
              fontSize="10"
              fill="#a1a1aa"
              textAnchor="middle"
            >
              {truncateLabel(xValues[idx] ?? "", 10)}
            </text>
          </g>
        );
      })}

      {/* Data lines / area fills */}
      {data.map((series, seriesIdx) => {
        const pts = series.values.map((v, i) => {
          const x = paddingLeft + i * xStep;
          const y = height - paddingBottom - ((v.y - minY) * yScale);
          return { x, y };
        });
        const polylinePoints = pts.map((p) => `${p.x},${p.y}`).join(" ");
        const areaPoints =
          `${paddingLeft},${height - paddingBottom} ` +
          polylinePoints +
          ` ${paddingLeft + (pts.length - 1) * xStep},${height - paddingBottom}`;
        return (
          <g key={`series-${seriesIdx}`}>
            {filled && (
              <polygon
                points={areaPoints}
                fill={colors[seriesIdx % colors.length]}
                opacity="0.18"
              />
            )}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={colors[seriesIdx % colors.length]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {series.values.map((v, i) => (
              <g key={`point-${seriesIdx}-${i}`}>
                <circle
                  cx={pts[i].x}
                  cy={pts[i].y}
                  r="3"
                  fill={colors[seriesIdx % colors.length]}
                  opacity="0.8"
                />
                {series.values.length <= 12 && (
                  <text
                    x={pts[i].x}
                    y={pts[i].y - 8}
                    fontSize="9"
                    fill="#d4d4d8"
                    textAnchor="middle"
                  >
                    {formatDataValue(v.y, yLabel)}
                  </text>
                )}
              </g>
            ))}
          </g>
        );
      })}

      {/* Legend */}
      {data.map((series, idx) => (
        <g key={`legend-${idx}`}>
          <rect
            x={width - 170}
            y={paddingTop + idx * 16}
            width={10}
            height={10}
            fill={colors[idx % colors.length]}
            rx="2"
          />
          <text x={width - 154} y={paddingTop + idx * 16 + 9} fontSize="10" fill="#d4d4d8">
            {truncateLabel(series.name, 20)}
          </text>
        </g>
      ))}

      {/* Axis labels */}
      {xLabel && (
        <text
          x={paddingLeft + chartWidth / 2}
          y={height - 10}
          fontSize="11"
          fill="#c4c4cc"
          textAnchor="middle"
        >
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          x={16}
          y={paddingTop + chartHeight / 2}
          fontSize="11"
          fill="#c4c4cc"
          textAnchor="middle"
          transform={`rotate(-90 16 ${paddingTop + chartHeight / 2})`}
        >
          {yLabel}
        </text>
      )}
    </svg>
  );
}

function BarChartSVG({
  data,
  xLabel,
  yLabel,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  xLabel?: string;
  yLabel?: string;
}) {
  const width = 640;
  const height = 300;
  const paddingLeft = 58;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 62;

  const allValues = data.flatMap((d) => d.values.map((v) => v.y));
  const maxY = Math.max(...allValues, 1);

  const xCount = data[0]?.values.length || 1;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const groupWidth = chartWidth / xCount;
  const barWidth = Math.max(8, groupWidth / (data.length + 0.6));
  const yScale = chartHeight / maxY;

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f97316"];
  const xValues = data[0]?.values.map((v) => v.x) ?? [];
  const tickIndices = getTickIndices(xValues.length, 6);

  return (
    <svg width="100%" height="300" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={`grid-${ratio}`}
          x1={paddingLeft}
          y1={height - paddingBottom - ratio * chartHeight}
          x2={width - paddingRight}
          y2={height - paddingBottom - ratio * chartHeight}
          stroke="#27272a"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis */}
      <line
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={height - paddingBottom}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* X-axis */}
      <line
        x1={paddingLeft}
        y1={height - paddingBottom}
        x2={width - paddingRight}
        y2={height - paddingBottom}
        stroke="#52525b"
        strokeWidth="2"
      />

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <text
          key={`y-label-${ratio}`}
          x={paddingLeft - 10}
          y={height - paddingBottom - ratio * chartHeight + 4}
          fontSize="11"
          fill="#9ca3af"
          textAnchor="end"
        >
          {formatAxisValue(ratio * maxY, yLabel)}
        </text>
      ))}

      {/* X-axis ticks */}
      {tickIndices.map((idx) => {
        const x = paddingLeft + idx * groupWidth + groupWidth / 2;
        return (
          <g key={`x-tick-${idx}`}>
            <line
              x1={x}
              y1={height - paddingBottom}
              x2={x}
              y2={height - paddingBottom + 5}
              stroke="#71717a"
              strokeWidth="1"
            />
            <text
              x={x}
              y={height - paddingBottom + 18}
              fontSize="10"
              fill="#a1a1aa"
              textAnchor="middle"
            >
              {truncateLabel(xValues[idx] ?? "", 10)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((series, seriesIdx) =>
        series.values.map((v, valueIdx) => {
          const barX =
            paddingLeft +
            valueIdx * groupWidth +
            seriesIdx * barWidth +
            3;
          const barHeight = (v.y * yScale);
          const barY = height - paddingBottom - barHeight;

          return (
            <g key={`bar-${seriesIdx}-${valueIdx}`}>
              <rect
                x={barX}
                y={barY}
                width={barWidth - 2}
                height={barHeight}
                fill={colors[seriesIdx % colors.length]}
                opacity="0.85"
                rx="2"
              />
              {xCount <= 12 && (
                <text
                  x={barX + (barWidth - 2) / 2}
                  y={barY - 6}
                  fontSize="9"
                  fill="#d4d4d8"
                  textAnchor="middle"
                >
                  {formatDataValue(v.y, yLabel)}
                </text>
              )}
            </g>
          );
        })
      )}

      {/* Legend */}
      {data.map((series, idx) => (
        <g key={`legend-${idx}`}>
          <rect
            x={width - 170}
            y={paddingTop + idx * 16}
            width={10}
            height={10}
            fill={colors[idx % colors.length]}
            rx="2"
          />
          <text x={width - 154} y={paddingTop + idx * 16 + 9} fontSize="10" fill="#d4d4d8">
            {truncateLabel(series.name, 20)}
          </text>
        </g>
      ))}

      {/* Axis labels */}
      {xLabel && (
        <text
          x={paddingLeft + chartWidth / 2}
          y={height - 10}
          fontSize="11"
          fill="#c4c4cc"
          textAnchor="middle"
        >
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          x={16}
          y={paddingTop + chartHeight / 2}
          fontSize="11"
          fill="#c4c4cc"
          textAnchor="middle"
          transform={`rotate(-90 16 ${paddingTop + chartHeight / 2})`}
        >
          {yLabel}
        </text>
      )}
    </svg>
  );
}

function PieChartSVG({
  data,
  yLabel,
  innerRadius = 0,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  yLabel?: string;
  innerRadius?: number;
}) {
  const width = 640;
  const height = 300;
  const cx = 200;
  const cy = 148;
  const r = 120;

  const colors = [
    "#38bdf8", "#818cf8", "#34d399", "#fb923c", "#f472b6",
    "#a78bfa", "#facc15", "#4ade80", "#60a5fa", "#f87171",
  ];

  // Flatten into slices: each {x, y} pair is one slice
  const allSlices = data.flatMap((s) =>
    s.values.map((v) => ({ label: v.x, value: v.y }))
  );
  const total = allSlices.reduce((s, v) => s + Math.abs(v.value), 0) || 1;

  // Pre-compute slice angles
  let currentAngle = -Math.PI / 2;
  const slices = allSlices.map((slice, idx) => {
    const startAngle = currentAngle;
    const sweep = (Math.abs(slice.value) / total) * 2 * Math.PI;
    currentAngle += sweep;
    const endAngle = currentAngle;
    const midAngle = startAngle + sweep / 2;
    const pct = (Math.abs(slice.value) / total) * 100;
    const labelR = r * 0.62;
    return {
      ...slice,
      startAngle,
      endAngle,
      midAngle,
      pct,
      labelX: cx + labelR * Math.cos(midAngle),
      labelY: cy + labelR * Math.sin(midAngle),
      idx,
    };
  });

  const polarToCartesian = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const describeArc = (slice: (typeof slices)[0]) => {
    const innerR = r * innerRadius;
    const start = polarToCartesian(slice.startAngle, r);
    const end = polarToCartesian(slice.endAngle, r);
    const largeArc = slice.endAngle - slice.startAngle > Math.PI ? 1 : 0;
    if (innerRadius > 0) {
      const startIn = polarToCartesian(slice.startAngle, innerR);
      const endIn = polarToCartesian(slice.endAngle, innerR);
      return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} L ${endIn.x.toFixed(2)} ${endIn.y.toFixed(2)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${startIn.x.toFixed(2)} ${startIn.y.toFixed(2)} Z`;
    }
    return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
  };

  const legendX = cx + r + 30;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} overflow="visible">
      {/* Slices */}
      {slices.map((s, i) => (
        <path
          key={i}
          d={describeArc(s)}
          fill={colors[i % colors.length]}
          stroke="#18181b"
          strokeWidth={1.5}
          opacity={0.9}
        />
      ))}

      {/* Percentage labels inside slice (only if slice ≥ 5%) */}
      {slices.map((s, i) =>
        s.pct >= 5 ? (
          <text
            key={i}
            x={s.labelX}
            y={s.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill="#fff"
            fontWeight="600"
          >
            {s.pct.toFixed(1)}%
          </text>
        ) : null
      )}

      {/* Legend */}
      {slices.map((s, i) => (
        <g key={i} transform={`translate(${legendX}, ${20 + i * 20})`}>
          <rect width={11} height={11} rx={2} fill={colors[i % colors.length]} />
          <text x={16} y={9} fontSize={11} fill="#d4d4d8" dominantBaseline="middle">
            {truncateLabel(s.label, 22)}
            {" — "}{formatDataValue(s.value, yLabel)}
            {" ("}{s.pct.toFixed(1)}{"%}"}
          </text>
        </g>
      ))}
    </svg>
  );
}

function HorizontalBarChartSVG({
  data,
  xLabel,
  yLabel,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  xLabel?: string;
  yLabel?: string;
}) {
  const width = 640;
  const height = 300;
  const paddingLeft = 120;
  const paddingRight = 60;
  const paddingTop = 20;
  const paddingBottom = 44;

  const allValues = data.flatMap((d) => d.values.map((v) => v.y));
  const maxX = Math.max(...allValues, 1);

  const series0 = data[0];
  const categories = series0?.values.map((v) => v.x) ?? [];
  const catCount = categories.length || 1;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const groupHeight = chartHeight / catCount;
  const barHeight = Math.max(6, groupHeight / (data.length + 0.6));
  const xScale = chartWidth / maxX;
  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f97316"];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {/* Grid vertical */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line key={ratio} x1={paddingLeft + ratio * chartWidth} y1={paddingTop}
          x2={paddingLeft + ratio * chartWidth} y2={height - paddingBottom}
          stroke="#27272a" strokeWidth="1" />
      ))}
      {/* Axes */}
      <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#52525b" strokeWidth="2" />
      <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#52525b" strokeWidth="2" />
      {/* X-axis ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <text key={ratio} x={paddingLeft + ratio * chartWidth} y={height - paddingBottom + 16}
          fontSize="10" fill="#9ca3af" textAnchor="middle">
          {formatAxisValue(ratio * maxX, xLabel)}
        </text>
      ))}
      {/* Category labels on Y */}
      {categories.map((cat, i) => (
        <text key={i} x={paddingLeft - 8} y={paddingTop + i * groupHeight + groupHeight / 2 + 4}
          fontSize="10" fill="#a1a1aa" textAnchor="end">
          {truncateLabel(cat, 16)}
        </text>
      ))}
      {/* Bars */}
      {data.map((series, seriesIdx) =>
        series.values.map((v, i) => {
          const barW = v.y * xScale;
          const barY = paddingTop + i * groupHeight + seriesIdx * barHeight + 3;
          return (
            <g key={`hbar-${seriesIdx}-${i}`}>
              <rect x={paddingLeft} y={barY} width={barW} height={barHeight - 2}
                fill={colors[seriesIdx % colors.length]} opacity="0.85" rx="2" />
              {barW > 32 && (
                <text x={paddingLeft + barW - 4} y={barY + (barHeight - 2) / 2 + 4}
                  fontSize="9" fill="#fff" textAnchor="end">{formatDataValue(v.y, xLabel)}</text>
              )}
            </g>
          );
        })
      )}
      {/* Legend */}
      {data.map((s, i) => (
        <g key={i}><rect x={width - paddingRight + 4} y={paddingTop + i * 16} width={10} height={10}
          rx="2" fill={colors[i % colors.length]} />
          <text x={width - paddingRight + 18} y={paddingTop + i * 16 + 9} fontSize="10" fill="#d4d4d8">{truncateLabel(s.name, 10)}</text>
        </g>
      ))}
      {xLabel && <text x={paddingLeft + chartWidth / 2} y={height - 6} fontSize="11" fill="#c4c4cc" textAnchor="middle">{xLabel}</text>}
      {yLabel && <text x={12} y={paddingTop + chartHeight / 2} fontSize="11" fill="#c4c4cc" textAnchor="middle" transform={`rotate(-90 12 ${paddingTop + chartHeight / 2})`}>{yLabel}</text>}
    </svg>
  );
}

function StackedBarChartSVG({
  data,
  xLabel,
  yLabel,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  xLabel?: string;
  yLabel?: string;
}) {
  const width = 640;
  const height = 300;
  const paddingLeft = 58;
  const paddingRight = 30;
  const paddingTop = 24;
  const paddingBottom = 62;

  const xCount = data[0]?.values.length || 1;
  const totals = Array.from({ length: xCount }, (_, i) =>
    data.reduce((sum, s) => sum + (s.values[i]?.y ?? 0), 0)
  );
  const maxY = Math.max(...totals, 1);
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const barWidth = Math.max(8, (chartWidth / xCount) * 0.7);
  const yScale = chartHeight / maxY;
  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f97316"];
  const xValues = data[0]?.values.map((v) => v.x) ?? [];
  const tickIndices = getTickIndices(xValues.length, 8);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <line key={r} x1={paddingLeft} y1={height - paddingBottom - r * chartHeight}
          x2={width - paddingRight} y2={height - paddingBottom - r * chartHeight} stroke="#27272a" strokeWidth="1" />
      ))}
      <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#52525b" strokeWidth="2" />
      <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#52525b" strokeWidth="2" />
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <text key={r} x={paddingLeft - 10} y={height - paddingBottom - r * chartHeight + 4}
          fontSize="11" fill="#9ca3af" textAnchor="end">{formatAxisValue(r * maxY, yLabel)}</text>
      ))}
      {tickIndices.map((idx) => {
        const x = paddingLeft + idx * (chartWidth / (xCount - 1 || 1));
        return (
          <g key={idx}>
            <line x1={x} y1={height - paddingBottom} x2={x} y2={height - paddingBottom + 5} stroke="#71717a" strokeWidth="1" />
            <text x={x} y={height - paddingBottom + 18} fontSize="10" fill="#a1a1aa" textAnchor="middle">{truncateLabel(xValues[idx] ?? "", 10)}</text>
          </g>
        );
      })}
      {/* Stacked bars */}
      {Array.from({ length: xCount }, (_, i) => {
        let stackY = height - paddingBottom;
        return data.map((series, seriesIdx) => {
          const val = series.values[i]?.y ?? 0;
          const barH = val * yScale;
          stackY -= barH;
          const barX = paddingLeft + i * (chartWidth / xCount) + ((chartWidth / xCount) - barWidth) / 2;
          return (
            <rect key={`stack-${i}-${seriesIdx}`} x={barX} y={stackY} width={barWidth} height={barH}
              fill={colors[seriesIdx % colors.length]} opacity="0.88" />
          );
        });
      })}
      {data.map((s, i) => (
        <g key={i}><rect x={width - 170} y={paddingTop + i * 16} width={10} height={10} rx="2" fill={colors[i % colors.length]} />
          <text x={width - 154} y={paddingTop + i * 16 + 9} fontSize="10" fill="#d4d4d8">{truncateLabel(s.name, 18)}</text>
        </g>
      ))}
      {xLabel && <text x={paddingLeft + chartWidth / 2} y={height - 10} fontSize="11" fill="#c4c4cc" textAnchor="middle">{xLabel}</text>}
      {yLabel && <text x={16} y={paddingTop + chartHeight / 2} fontSize="11" fill="#c4c4cc" textAnchor="middle" transform={`rotate(-90 16 ${paddingTop + chartHeight / 2})`}>{yLabel}</text>}
    </svg>
  );
}

function ScatterChartSVG({
  data,
  xLabel,
  yLabel,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  xLabel?: string;
  yLabel?: string;
}) {
  const width = 640;
  const height = 300;
  const paddingLeft = 58;
  const paddingRight = 30;
  const paddingTop = 24;
  const paddingBottom = 62;

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#f97316"];
  const allY = data.flatMap((s) => s.values.map((v) => v.y));
  const maxY = Math.max(...allY, 1);
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Try to use numeric X; fallback to index
  const allXRaw = data[0]?.values.map((v) => parseFloat(v.x)) ?? [];
  const xIsNumeric = allXRaw.every((n) => !isNaN(n));
  const minX = xIsNumeric ? Math.min(...allXRaw, 0) : 0;
  const maxX = xIsNumeric ? Math.max(...allXRaw, 1) : (data[0]?.values.length - 1 || 1);

  const toSvgX = (v: { x: string }, i: number) =>
    paddingLeft + ((xIsNumeric ? parseFloat(v.x) - minX : i) / (maxX - minX || 1)) * chartWidth;
  const toSvgY = (y: number) => height - paddingBottom - (y / maxY) * chartHeight;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <line key={r} x1={paddingLeft} y1={height - paddingBottom - r * chartHeight}
          x2={width - paddingRight} y2={height - paddingBottom - r * chartHeight} stroke="#27272a" strokeWidth="1" />
      ))}
      <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#52525b" strokeWidth="2" />
      <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#52525b" strokeWidth="2" />
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <text key={r} x={paddingLeft - 10} y={height - paddingBottom - r * chartHeight + 4}
          fontSize="11" fill="#9ca3af" textAnchor="end">{formatAxisValue(r * maxY, yLabel)}</text>
      ))}
      {data.map((series, sIdx) =>
        series.values.map((v, i) => (
          <circle key={`dot-${sIdx}-${i}`} cx={toSvgX(v, i)} cy={toSvgY(v.y)}
            r="5" fill={colors[sIdx % colors.length]} opacity="0.75" stroke="#18181b" strokeWidth="1" />
        ))
      )}
      {data.map((s, i) => (
        <g key={i}><circle cx={width - 175} cy={paddingTop + i * 16 + 5} r="5" fill={colors[i % colors.length]} />
          <text x={width - 165} y={paddingTop + i * 16 + 9} fontSize="10" fill="#d4d4d8">{truncateLabel(s.name, 16)}</text>
        </g>
      ))}
      {xLabel && <text x={paddingLeft + chartWidth / 2} y={height - 10} fontSize="11" fill="#c4c4cc" textAnchor="middle">{xLabel}</text>}
      {yLabel && <text x={16} y={paddingTop + chartHeight / 2} fontSize="11" fill="#c4c4cc" textAnchor="middle" transform={`rotate(-90 16 ${paddingTop + chartHeight / 2})`}>{yLabel}</text>}
    </svg>
  );
}

function HeatmapChartSVG({
  rawData,
  chart,
}: {
  rawData: Record<string, unknown>[];
  chart: { x_field?: string; y_field?: string; group_by?: string; x_axis_label?: string; y_axis_label?: string };
}) {
  const xField = chart.x_field ?? "";
  const yField = chart.y_field ?? "";
  const rowField = chart.group_by ?? "";

  const rows = [...new Set(rawData.map((r) => String(r[rowField] ?? r[xField] ?? "")))];
  const cols = [...new Set(rawData.map((r) => String(r[xField] ?? "")))];
  const getCellValue = (row: string, col: string) => {
    const entry = rawData.find(
      (r) => String(r[rowField] ?? r[xField] ?? "") === row && String(r[xField] ?? "") === col
    );
    return entry ? Number(entry[yField]) || 0 : 0;
  };

  const allVals = rows.flatMap((row) => cols.map((col) => getCellValue(row, col)));
  const maxVal = Math.max(...allVals, 1);

  const cellW = Math.min(60, Math.max(20, Math.floor(480 / (cols.length || 1))));
  const cellH = Math.min(36, Math.max(16, Math.floor(200 / (rows.length || 1))));
  const leftPad = 90;
  const topPad = 30;
  const svgW = leftPad + cols.length * cellW + 10;
  const svgH = topPad + rows.length * cellH + 20;

  const toColor = (val: number) => {
    const t = val / maxVal;
    const r = Math.round(56 + t * (59 - 56));
    const g = Math.round(189 + t * (130 - 189));
    const b = Math.round(248 + t * (246 - 248));
    const alpha = 0.15 + t * 0.8;
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height={svgH}>
      {cols.map((col, ci) => (
        <text key={ci} x={leftPad + ci * cellW + cellW / 2} y={topPad - 6}
          fontSize="9" fill="#9ca3af" textAnchor="middle">{truncateLabel(col, 8)}</text>
      ))}
      {rows.map((row, ri) => (
        <g key={ri}>
          <text x={leftPad - 4} y={topPad + ri * cellH + cellH / 2 + 4}
            fontSize="9" fill="#a1a1aa" textAnchor="end">{truncateLabel(row, 12)}</text>
          {cols.map((col, ci) => {
            const val = getCellValue(row, col);
            return (
              <g key={ci}>
                <rect x={leftPad + ci * cellW} y={topPad + ri * cellH}
                  width={cellW - 1} height={cellH - 1} rx="2" fill={toColor(val)} />
                {cellW > 28 && cellH > 18 && (
                  <text x={leftPad + ci * cellW + cellW / 2} y={topPad + ri * cellH + cellH / 2 + 4}
                    fontSize="8" fill="#e4e4e7" textAnchor="middle">{formatAxisValue(val, chart.y_axis_label)}</text>
                )}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

function ComboChartSVG({
  data,
  xLabel,
  yLabel,
}: {
  data: Array<{ name: string; values: Array<{ x: string; y: number }> }>;
  xLabel?: string;
  yLabel?: string;
}) {
  const width = 640;
  const height = 300;
  const paddingLeft = 58;
  const paddingRight = 30;
  const paddingTop = 24;
  const paddingBottom = 62;

  const allValues = data.flatMap((d) => d.values.map((v) => v.y));
  const maxY = Math.max(...allValues, 1);
  const xCount = data[0]?.values.length || 1;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const xStep = chartWidth / (xCount - 1 || 1);
  const yScale = chartHeight / maxY;
  const barWidth = Math.max(8, (chartWidth / xCount) * 0.5);
  const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#f97316"];
  const xValues = data[0]?.values.map((v) => v.x) ?? [];
  const tickIndices = getTickIndices(xValues.length, 6);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <line key={r} x1={paddingLeft} y1={height - paddingBottom - r * chartHeight}
          x2={width - paddingRight} y2={height - paddingBottom - r * chartHeight} stroke="#27272a" strokeWidth="1" />
      ))}
      <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#52525b" strokeWidth="2" />
      <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#52525b" strokeWidth="2" />
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <text key={r} x={paddingLeft - 10} y={height - paddingBottom - r * chartHeight + 4}
          fontSize="11" fill="#9ca3af" textAnchor="end">{formatAxisValue(r * maxY, yLabel)}</text>
      ))}
      {tickIndices.map((idx) => {
        const x = paddingLeft + idx * xStep;
        return (
          <g key={idx}>
            <line x1={x} y1={height - paddingBottom} x2={x} y2={height - paddingBottom + 5} stroke="#71717a" strokeWidth="1" />
            <text x={x} y={height - paddingBottom + 18} fontSize="10" fill="#a1a1aa" textAnchor="middle">{truncateLabel(xValues[idx] ?? "", 10)}</text>
          </g>
        );
      })}
      {/* First series: bars */}
      {data[0]?.values.map((v, i) => {
        const barH = v.y * yScale;
        const barX = paddingLeft + i * (chartWidth / xCount) + ((chartWidth / xCount) - barWidth) / 2;
        return (
          <rect key={i} x={barX} y={height - paddingBottom - barH} width={barWidth} height={barH}
            fill={colors[0]} opacity="0.75" rx="2" />
        );
      })}
      {/* Remaining series: lines */}
      {data.slice(1).map((series, sIdx) => (
        <g key={sIdx}>
          <polyline
            points={series.values.map((v, i) => `${paddingLeft + i * xStep},${height - paddingBottom - v.y * yScale}`).join(" ")}
            fill="none" stroke={colors[sIdx + 1 % colors.length]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {series.values.map((v, i) => (
            <circle key={i} cx={paddingLeft + i * xStep} cy={height - paddingBottom - v.y * yScale}
              r="3" fill={colors[(sIdx + 1) % colors.length]} />
          ))}
        </g>
      ))}
      {data.map((s, i) => (
        <g key={i}>
          {i === 0
            ? <rect x={width - 170} y={paddingTop + i * 16} width={10} height={10} rx="2" fill={colors[i % colors.length]} />
            : <line x1={width - 170} y1={paddingTop + i * 16 + 5} x2={width - 160} y2={paddingTop + i * 16 + 5} stroke={colors[i % colors.length]} strokeWidth="2" />
          }
          <text x={width - 154} y={paddingTop + i * 16 + 9} fontSize="10" fill="#d4d4d8">{truncateLabel(s.name, 18)}</text>
        </g>
      ))}
      {xLabel && <text x={paddingLeft + chartWidth / 2} y={height - 10} fontSize="11" fill="#c4c4cc" textAnchor="middle">{xLabel}</text>}
      {yLabel && <text x={16} y={paddingTop + chartHeight / 2} fontSize="11" fill="#c4c4cc" textAnchor="middle" transform={`rotate(-90 16 ${paddingTop + chartHeight / 2})`}>{yLabel}</text>}
    </svg>
  );
}

function TableChartView({ data }: { data: Record<string, unknown>[] }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-4 text-zinc-400">Sin datos para mostrar</div>;
  }
  const cols = Object.keys(data[0]);
  const rows = data.slice(0, 20);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-zinc-200 border-collapse">
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col} className="px-3 py-2 text-left text-zinc-400 border-b border-zinc-700 font-medium uppercase tracking-wide">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-zinc-900/40" : ""}>
              {cols.map((col) => (
                <td key={col} className="px-3 py-1.5 border-b border-zinc-800/50 tabular-nums">
                  {String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 20 && (
        <p className="text-center text-zinc-500 text-[11px] mt-2">Mostrando 20 de {data.length} filas</p>
      )}
    </div>
  );
}

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function getTickIndices(total: number, maxTicks: number) {
  if (total <= 0) return [] as number[];
  if (total <= maxTicks) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const step = Math.ceil(total / maxTicks);
  const indices: number[] = [];
  for (let i = 0; i < total; i += step) {
    indices.push(i);
  }

  if (indices[indices.length - 1] !== total - 1) {
    indices.push(total - 1);
  }

  return indices;
}

function formatAxisValue(value: number, yLabel?: string) {
  return formatSmartValue(value, yLabel, true);
}

function formatDataValue(value: number, yLabel?: string) {
  return formatSmartValue(value, yLabel, false);
}

function formatSmartValue(value: number, yLabel?: string, compact: boolean = true) {
  if (!Number.isFinite(value)) return "0";

  const isPercentage = /%|porcent|percent/i.test(yLabel ?? "");
  const abs = Math.abs(value);

  if (isPercentage) {
    const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
    return `${trimTrailingZeros(value.toFixed(decimals))}%`;
  }

  if (abs >= 1_000_000_000) {
    const scaled = value / 1_000_000_000;
    return `${trimTrailingZeros(scaled.toFixed(compact ? 1 : 2))}B`;
  }

  if (abs >= 1_000_000) {
    const scaled = value / 1_000_000;
    return `${trimTrailingZeros(scaled.toFixed(compact ? 1 : 2))}M`;
  }

  if (abs >= 1_000) {
    const scaled = value / 1_000;
    return `${trimTrailingZeros(scaled.toFixed(compact ? 1 : 2))}K`;
  }

  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return trimTrailingZeros(value.toFixed(decimals));
}

function trimTrailingZeros(value: string) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}
