import React, { useMemo } from 'react'

interface MiniSparklineProps {
  values: number[]
  /** Stroke colour for the line. Fill uses the same colour at low opacity. */
  color?: string
  width?: number
  height?: number
  className?: string
}

/**
 * Tiny inline equity-curve preview used on the AgentHome Recents tiles.
 * Renders a smooth area chart in SVG — no external deps, cheap to mount in
 * a grid of 16 tiles. Falls back to a flat baseline when given fewer than
 * 2 data points.
 */
export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  values,
  color = '#535862',
  width = 140,
  height = 64,
  className,
}) => {
  const { linePath, areaPath } = useMemo(() => {
    if (!values || values.length < 2) {
      return { linePath: '', areaPath: '' }
    }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const stepX = width / (values.length - 1)
    const padTop = 6
    const padBottom = 4
    const usableH = height - padTop - padBottom

    const points = values.map((v, i) => {
      const x = i * stepX
      const y = padTop + usableH - ((v - min) / range) * usableH
      return [x, y] as const
    })

    // Smooth bezier path
    const segs: string[] = []
    points.forEach(([x, y], i) => {
      if (i === 0) {
        segs.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`)
        return
      }
      const [px, py] = points[i - 1]
      const cx1 = px + (x - px) / 2
      const cx2 = px + (x - px) / 2
      segs.push(`C ${cx1.toFixed(2)} ${py.toFixed(2)}, ${cx2.toFixed(2)} ${y.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`)
    })
    const linePath = segs.join(' ')
    const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`
    return { linePath, areaPath }
  }, [values, width, height])

  if (!linePath) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className={className}
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#E5E7EB"
          strokeWidth={1.5}
        />
      </svg>
    )
  }

  const gradId = `mini-spark-grad-${Math.random().toString(36).slice(2, 8)}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
