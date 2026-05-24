/**
 * puro SVG componente gráfico，para visualização de desempenho。Não depende de nenhuma biblioteca de gráficos de terceiros。
 * Gráfico de linhas de suporte（Incluindo preenchimento de área）e histograma，adaptação AI Negociação de ações Memory Tab Exibição de dados。
 */

interface DataPoint {
  label: string
  value: number
}

interface MiniLineChartProps {
  data: DataPoint[]
  width?: number
  height?: number
  /** Cor da polilinha */
  strokeColor?: string
  /** cor de preenchimento da área（Com transparência）*/
  fillColor?: string
  /** Se deve exibir a linha zero */
  showZeroLine?: boolean
  /** Função de formatação de valor */
  formatValue?: (value: number) => string
  /** título */
  title: string
}

const PADDING = { top: 20, right: 16, bottom: 40, left: 56 }

function computeScale(
  data: DataPoint[],
  chartWidth: number,
  chartHeight: number,
): { xScale: (index: number) => number; yScale: (value: number) => number; minVal: number; maxVal: number } {
  const values = data.map((d) => d.value)
  let minVal = Math.min(...values)
  let maxVal = Math.max(...values)

  // Certifique-se de ter pelo menos algum escopo，Evite quando todos os valores são iguais y degeneração do eixo
  if (maxVal === minVal) {
    minVal -= 1
    maxVal += 1
  }

  // Dar y eixo para ficar 10% margem
  const range = maxVal - minVal
  minVal -= range * 0.1
  maxVal += range * 0.1

  const xScale = (index: number) => (data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2)
  const yScale = (value: number) => chartHeight - ((value - minVal) / (maxVal - minVal)) * chartHeight

  return { xScale, yScale, minVal, maxVal }
}

function generateGridLines(minVal: number, maxVal: number, count: number): number[] {
  const step = (maxVal - minVal) / (count + 1)
  const lines: number[] = []
  for (let i = 1; i <= count; i++) {
    lines.push(minVal + step * i)
  }
  return lines
}

function defaultFormat(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function MiniLineChart({
  data,
  width = 400,
  height = 200,
  strokeColor = '#4f46e5',
  fillColor = 'rgba(79, 70, 229, 0.08)',
  showZeroLine = false,
  formatValue = defaultFormat,
  title,
}: MiniLineChartProps) {
  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
        <h4 className="font-semibold text-slate-700 mb-2 text-sm">{title}</h4>
        <div className="flex items-center justify-center text-sm text-slate-400" style={{ height: height - 40 }}>
          Dados insuficientes，Pelo menos obrigatório 2 ciclos
        </div>
      </div>
    )
  }

  const chartWidth = width - PADDING.left - PADDING.right
  const chartHeight = height - PADDING.top - PADDING.bottom
  const { xScale, yScale, minVal, maxVal } = computeScale(data, chartWidth, chartHeight)

  // Construir um caminho de polilinha
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`)
    .join(' ')

  // Construa um caminho de área preenchida
  const areaPath = `${linePath} L ${xScale(data.length - 1)} ${chartHeight} L ${xScale(0)} ${chartHeight} Z`

  // linhas de grade
  const gridLines = generateGridLines(minVal, maxVal, 3)

  // Posição da linha zero（se estiver dentro do alcance visual）
  const zeroY = showZeroLine && minVal <= 0 && maxVal >= 0 ? yScale(0) : null

  // X rótulos de eixo：Mostrar mais 6 individual，uniformemente distribuído
  const maxLabels = Math.min(6, data.length)
  const labelIndices: number[] = []
  if (data.length <= maxLabels) {
    for (let i = 0; i < data.length; i++) labelIndices.push(i)
  } else {
    for (let i = 0; i < maxLabels; i++) {
      labelIndices.push(Math.round((i / (maxLabels - 1)) * (data.length - 1)))
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <h4 className="font-semibold text-slate-700 mb-2 text-sm">{title}</h4>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
          {/* linhas de grade */}
          {gridLines.map((val) => (
            <g key={`grid-${val}`}>
              <line
                x1={0}
                y1={yScale(val)}
                x2={chartWidth}
                y2={yScale(val)}
                stroke="#e2e8f0"
                strokeDasharray="3,3"
              />
              <text
                x={-8}
                y={yScale(val)}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-[10px]"
                fill="#94a3b8"
              >
                {formatValue(val)}
              </text>
            </g>
          ))}

          {/* Linha neutra */}
          {zeroY !== null ? (
            <line
              x1={0}
              y1={zeroY}
              x2={chartWidth}
              y2={zeroY}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="4,2"
            />
          ) : null}

          {/* preenchimento de área */}
          <path d={areaPath} fill={fillColor} />

          {/* Polilinha */}
          <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={2} strokeLinejoin="round" />

          {/* pontos de dados */}
          {data.map((d, i) => (
            <g key={`point-${i}`}>
              <circle
                cx={xScale(i)}
                cy={yScale(d.value)}
                r={data.length <= 12 ? 3 : 2}
                fill="white"
                stroke={strokeColor}
                strokeWidth={1.5}
              />
              {/* Tooltip área（Invisível, mas disponível hover） */}
              <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            </g>
          ))}

          {/* X rótulos de eixo */}
          {labelIndices.map((i) => (
            <text
              key={`xlabel-${i}`}
              x={xScale(i)}
              y={chartHeight + 16}
              textAnchor="middle"
              className="text-[9px]"
              fill="#94a3b8"
            >
              {data[i].label}
            </text>
          ))}

          {/* Anotação de valor mais recente */}
          <text
            x={xScale(data.length - 1)}
            y={yScale(data[data.length - 1].value) - 10}
            textAnchor="end"
            className="text-[11px] font-semibold"
            fill={strokeColor}
          >
            {formatValue(data[data.length - 1].value)}
          </text>
        </g>
      </svg>
    </div>
  )
}

interface MiniBarChartProps {
  data: DataPoint[]
  width?: number
  height?: number
  /** cor positiva */
  positiveColor?: string
  /** cor negativa */
  negativeColor?: string
  /** Função de formatação de valor */
  formatValue?: (value: number) => string
  /** título */
  title: string
}

export function MiniBarChart({
  data,
  width = 400,
  height = 200,
  positiveColor = '#ef4444',
  negativeColor = '#22c55e',
  formatValue = defaultFormat,
  title,
}: MiniBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
        <h4 className="font-semibold text-slate-700 mb-2 text-sm">{title}</h4>
        <div className="flex items-center justify-center text-sm text-slate-400" style={{ height: height - 40 }}>
          Ainda não há dados
        </div>
      </div>
    )
  }

  const chartWidth = width - PADDING.left - PADDING.right
  const chartHeight = height - PADDING.top - PADDING.bottom
  const values = data.map((d) => d.value)
  let minVal = Math.min(...values, 0)
  let maxVal = Math.max(...values, 0)

  if (maxVal === minVal) {
    minVal -= 1
    maxVal += 1
  }

  const range = maxVal - minVal
  minVal -= range * 0.05
  maxVal += range * 0.05

  const yScale = (value: number) => chartHeight - ((value - minVal) / (maxVal - minVal)) * chartHeight
  const zeroY = yScale(0)

  const barGap = 2
  const barWidth = Math.max(4, (chartWidth - barGap * (data.length - 1)) / data.length)

  // linhas de grade
  const gridLines = generateGridLines(minVal, maxVal, 3)

  // X rótulos de eixo
  const maxLabels = Math.min(6, data.length)
  const labelIndices: number[] = []
  if (data.length <= maxLabels) {
    for (let i = 0; i < data.length; i++) labelIndices.push(i)
  } else {
    for (let i = 0; i < maxLabels; i++) {
      labelIndices.push(Math.round((i / (maxLabels - 1)) * (data.length - 1)))
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <h4 className="font-semibold text-slate-700 mb-2 text-sm">{title}</h4>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
          {/* linhas de grade */}
          {gridLines.map((val) => (
            <g key={`grid-${val}`}>
              <line x1={0} y1={yScale(val)} x2={chartWidth} y2={yScale(val)} stroke="#e2e8f0" strokeDasharray="3,3" />
              <text x={-8} y={yScale(val)} textAnchor="end" dominantBaseline="middle" className="text-[10px]" fill="#94a3b8">
                {formatValue(val)}
              </text>
            </g>
          ))}

          {/* Linha neutra */}
          <line x1={0} y1={zeroY} x2={chartWidth} y2={zeroY} stroke="#94a3b8" strokeWidth={1} />

          {/* Pilar */}
          {data.map((d, i) => {
            const x = i * (barWidth + barGap)
            const barY = d.value >= 0 ? yScale(d.value) : zeroY
            const barH = Math.abs(yScale(d.value) - zeroY)
            const color = d.value >= 0 ? positiveColor : negativeColor

            return (
              <g key={`bar-${i}`}>
                <rect
                  x={x}
                  y={barY}
                  width={barWidth}
                  height={Math.max(1, barH)}
                  fill={color}
                  rx={2}
                  opacity={0.85}
                />
                <title>{`${d.label}: ${formatValue(d.value)}`}</title>
              </g>
            )
          })}

          {/* X rótulos de eixo */}
          {labelIndices.map((i) => (
            <text
              key={`xlabel-${i}`}
              x={i * (barWidth + barGap) + barWidth / 2}
              y={chartHeight + 16}
              textAnchor="middle"
              className="text-[9px]"
              fill="#94a3b8"
            >
              {data[i].label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  )
}
