import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface SparklineProps {
  data: number[]
  color: string
  width?: number
  height?: number
  animated?: boolean
  /** Render with viewBox so the chart scales to fit its container */
  responsive?: boolean
}

export function Sparkline({
  data,
  color,
  width = 80,
  height = 24,
  animated = true,
  responsive = false,
}: SparklineProps) {
  const points = useMemo(() => {
    if (data.length < 2) return ''
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const step = width / (data.length - 1)

    return data
      .map((val, i) => {
        const x = i * step
        const y = height - ((val - min) / range) * (height - 4) - 2
        return `${x},${y}`
      })
      .join(' ')
  }, [data, width, height])

  const areaPath = useMemo(() => {
    if (data.length < 2) return ''
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const step = width / (data.length - 1)

    const pts = data.map((val, i) => {
      const x = i * step
      const y = height - ((val - min) / range) * (height - 4) - 2
      return { x, y }
    })

    return (
      `M0,${height} ` +
      pts.map((p) => `L${p.x},${p.y}`).join(' ') +
      ` L${width},${height} Z`
    )
  }, [data, width, height])

  if (data.length < 2) return null

  return (
    <svg
      width={responsive ? undefined : width}
      height={responsive ? undefined : height}
      viewBox={responsive ? `0 0 ${width} ${height}` : undefined}
      className={responsive ? 'w-full h-auto overflow-visible' : 'overflow-visible'}
    >
      {/* Gradient fill */}
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <motion.path
        d={areaPath}
        fill={`url(#spark-grad-${color.replace('#', '')})`}
        initial={animated ? { opacity: 0 } : { opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* Line */}
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animated ? { pathLength: 0, opacity: 0 } : {}}
        animate={animated ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      {/* End dot */}
      {data.length > 0 && (
        <motion.circle
          cx={width}
          cy={
            height -
            ((data[data.length - 1] - Math.min(...data)) /
              (Math.max(...data) - Math.min(...data) || 1)) *
              (height - 4) -
            2
          }
          r="2.5"
          fill={color}
          initial={animated ? { scale: 0 } : { scale: 1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
        />
      )}
    </svg>
  )
}

// Generate fake historical data for demo
export function generateSparkData(base: number, points: number = 12): number[] {
  const data: number[] = []
  let current = base * 0.6
  for (let i = 0; i < points; i++) {
    current += (Math.random() - 0.3) * base * 0.15
    current = Math.max(base * 0.2, Math.min(base * 1.2, current))
    data.push(Math.round(current))
  }
  return data
}
