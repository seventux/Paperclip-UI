import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  Coins,
  Download,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Sparkline } from './Sparkline'
import type { CostPeriod, OrgEmployee } from '../types'

/** Estimated price per 1K tokens (demo rate: $3 / 1M tokens) */
const COST_PER_1K = 0.003

const PERIOD_CONFIG: Record<CostPeriod, { label: string; points: number }> = {
  daily: { label: 'Daily', points: 30 },
  weekly: { label: 'Weekly', points: 12 },
  monthly: { label: 'Monthly', points: 12 },
}

/** Deterministic PRNG (mulberry32) so synthetic history is stable across renders */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build a cumulative usage series that ends exactly at the agent's current
 * token total. Increments vary around the average so the curve looks organic
 * but stays deterministic per agent.
 */
function buildSeries(emp: OrgEmployee, points: number): number[] {
  const rand = mulberry32(seedFromString(emp.id))
  const avg = emp.tokens_used / points
  const increments: number[] = []
  let total = 0
  for (let i = 0; i < points; i++) {
    const factor = 0.4 + rand() * 1.2
    let inc = avg * factor
    if (i === points - 1) inc = Math.max(0, emp.tokens_used - total)
    total += inc
    increments.push(Math.round(total))
  }
  // Force the final point to the true current total
  increments[points - 1] = emp.tokens_used
  return increments
}

function seedFromString(str: string): number {
  let seed = 0
  for (let i = 0; i < str.length; i++) {
    seed = (seed * 31 + str.charCodeAt(i)) | 0
  }
  return seed >>> 0
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

function formatFullCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function costOf(tokens: number): number {
  return (tokens / 1000) * COST_PER_1K
}

export function CostDashboard() {
  const { employees } = useStore()
  const [period, setPeriod] = useState<CostPeriod>('daily')

  const agentList = useMemo(
    () => Object.values(employees).sort((a, b) => b.tokens_used - a.tokens_used),
    [employees]
  )

  const cfg = PERIOD_CONFIG[period]

  // Per-agent cumulative series for the selected period
  const seriesByAgent = useMemo(
    () =>
      agentList.map((emp) => ({
        emp,
        series: buildSeries(emp, cfg.points),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, agentList]
  )

  // Always compute a daily series for burn-rate forecasting
  const dailyByAgent = useMemo(
    () =>
      agentList.map((emp) => ({
        emp,
        series: buildSeries(emp, 30),
      })),
    [agentList]
  )

  const totalSeries = useMemo(() => {
    const totals: number[] = []
    for (let i = 0; i < cfg.points; i++) {
      totals.push(seriesByAgent.reduce((sum, s) => sum + s.series[i], 0))
    }
    return totals
  }, [seriesByAgent, cfg.points])

  const totalTokens = useMemo(
    () => agentList.reduce((sum, e) => sum + e.tokens_used, 0),
    [agentList]
  )
  const totalBudget = useMemo(
    () => agentList.reduce((sum, e) => sum + e.budget, 0),
    [agentList]
  )

  /** Avg tokens burned per day (last 7 increments of the daily series) */
  const burnPerDay = (emp: OrgEmployee): number => {
    const entry = dailyByAgent.find((d) => d.emp.id === emp.id)
    if (!entry) return 0
    const series = entry.series
    const window = series.slice(-7)
    if (window.length < 2) return 0
    return Math.max(0, (window[window.length - 1] - window[0]) / (window.length - 1))
  }

  const daysLeft = (emp: OrgEmployee): number | null => {
    const burn = burnPerDay(emp)
    const remaining = emp.budget - emp.tokens_used
    if (burn <= 0) return null
    return Math.max(0, remaining / burn)
  }

  const projectedDate = (emp: OrgEmployee): Date | null => {
    const days = daysLeft(emp)
    if (days === null) return null
    return new Date(Date.now() + days * 24 * 3600 * 1000)
  }

  const totalBurn = useMemo(
    () => agentList.reduce((sum, e) => sum + burnPerDay(e), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentList]
  )
  const projectedMonthlySpend = totalBurn * 30 * (COST_PER_1K / 1000)
  const totalSpend = costOf(totalTokens)
  const budgetUsedPct = Math.round((totalTokens / totalBudget) * 100)

  const exportCsv = () => {
    const header = [
      'Agent',
      'Role',
      'Tokens Used',
      'Cost (USD)',
      'Budget',
      'Usage %',
      'Burn/Day (tokens)',
      'Projected Days Left',
    ]
    const rows = agentList.map((e) => {
      const burn = Math.round(burnPerDay(e))
      const dl = daysLeft(e)
      return [
        e.name,
        e.role,
        e.tokens_used,
        costOf(e.tokens_used).toFixed(4),
        e.budget,
        Math.round((e.tokens_used / e.budget) * 100),
        burn,
        dl === null ? '' : Math.round(dl),
      ].join(',')
    })
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'paperclip-cost-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Chart dimensions (viewBox coordinates)
  const W = 640
  const H = 200
  const PAD_X = 8
  const PAD_Y = 12
  const maxTotal = Math.max(...totalSeries, 1)
  const chartPoints = totalSeries.map((v, i) => {
    const x = PAD_X + (i / (cfg.points - 1)) * (W - PAD_X * 2)
    const y = H - PAD_Y - (v / maxTotal) * (H - PAD_Y * 2)
    return { x, y, value: v, i }
  })
  const areaPath =
    `M${chartPoints[0].x},${H - PAD_Y} ` +
    chartPoints.map((p) => `L${p.x},${p.y}`).join(' ') +
    ` L${chartPoints[chartPoints.length - 1].x},${H - PAD_Y} Z`

  const tickIndices = [0, Math.floor((cfg.points - 1) / 3), Math.floor(((cfg.points - 1) * 2) / 3), cfg.points - 1]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-auto p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Cost Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Token spend, per-agent breakdown & budget forecasting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
            {(Object.keys(PERIOD_CONFIG) as CostPeriod[]).map((p) => (
              <button
                key={p}
                data-period={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  period === p
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {PERIOD_CONFIG[p].label}
              </button>
            ))}
          </div>
          <button
            data-export-csv
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-xs font-medium hover:bg-indigo-500/25 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="glass-strong p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Total Spend
            </p>
          </div>
          <p className="text-xl font-bold text-white">{formatFullCurrency(totalSpend)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            @ ${(COST_PER_1K * 1000).toFixed(3)} / 1M tokens
          </p>
        </div>
        <div className="glass-strong p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Coins className="w-3.5 h-3.5 text-indigo-400" />
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Tokens Used
            </p>
          </div>
          <p className="text-xl font-bold text-white">{(totalTokens / 1000).toFixed(1)}K</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            of {(totalBudget / 1000).toFixed(0)}K budget ({budgetUsedPct}%)
          </p>
        </div>
        <div className="glass-strong p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Avg Daily Burn
            </p>
          </div>
          <p className="text-xl font-bold text-white">{(totalBurn / 1000).toFixed(1)}K</p>
          <p className="text-[10px] text-slate-500 mt-0.5">tokens per day, all agents</p>
        </div>
        <div className="glass-strong p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <CalendarRange className="w-3.5 h-3.5 text-rose-400" />
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Projected 30d Spend
            </p>
          </div>
          <p className="text-xl font-bold text-white">
            {formatFullCurrency(projectedMonthlySpend)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">at current burn rate</p>
        </div>
      </div>

      {/* Time-series chart */}
      <div className="glass-strong p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Total Token Usage — {cfg.label}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cumulative across all agents · peak {formatCurrency(costOf(maxTotal))} spend
            </p>
          </div>
          <span className="text-xs font-semibold text-white">
            {formatCurrency(costOf(totalSeries[totalSeries.length - 1]))} today
          </span>
        </div>
        <div data-cost-chart className="w-full">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="cost-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Gridlines */}
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1={PAD_X}
                x2={W - PAD_X}
                y1={PAD_Y + (H - PAD_Y * 2) * (1 - f)}
                y2={PAD_Y + (H - PAD_Y * 2) * (1 - f)}
                stroke="rgba(148,163,184,0.12)"
                strokeDasharray="4 4"
              />
            ))}
            {/* Area */}
            <motion.path
              d={areaPath}
              fill="url(#cost-area-grad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
            {/* Line */}
            <motion.polyline
              points={chartPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            {/* Hover points with tooltips */}
            {chartPoints.map((p) => (
              <g key={p.i} className="cursor-pointer">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="10"
                  fill="transparent"
                  className="group"
                />
                <circle cx={p.x} cy={p.y} r="3" fill="#6366f1" stroke="#0f172a" strokeWidth="1.5" />
                <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <rect
                    x={p.x - 42}
                    y={Math.max(2, p.y - 34)}
                    width="84"
                    height="24"
                    rx="6"
                    fill="rgba(2,6,23,0.9)"
                  />
                  <text
                    x={p.x}
                    y={Math.max(18, p.y - 18)}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {(p.value / 1000).toFixed(0)}K
                  </text>
                </g>
              </g>
            ))}
            {/* X axis labels */}
            {tickIndices.map((idx) => (
              <text
                key={idx}
                x={chartPoints[idx].x}
                y={H - 1}
                textAnchor={idx === 0 ? 'start' : idx === cfg.points - 1 ? 'end' : 'middle'}
                fill="#64748b"
                fontSize="9"
              >
                {idx === 0 ? `${cfg.points} ${cfg.label === 'Daily' ? 'd' : cfg.label === 'Weekly' ? 'w' : 'mo'} ago` : idx === cfg.points - 1 ? 'Today' : ''}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Per-agent breakdown + forecast */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Breakdown table */}
        <div className="glass-strong p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
            Per-Agent Breakdown
          </p>
          <div className="flex flex-col gap-1.5">
            {seriesByAgent.map(({ emp, series }) => {
              const pct = Math.round((emp.tokens_used / emp.budget) * 100)
              return (
                <div
                  key={emp.id}
                  data-agent-row={emp.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/3 border border-white/5"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ background: `${emp.color}20` }}
                  >
                    {emp.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white truncate">{emp.name}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {(emp.tokens_used / 1000).toFixed(1)}K · {formatCurrency(costOf(emp.tokens_used))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex-1">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, pct)}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{
                            background:
                              pct > 80
                                ? 'linear-gradient(90deg, #f43f5e, #ef4444)'
                                : pct > 50
                                  ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                                  : `linear-gradient(90deg, ${emp.color}, ${emp.color}99)`,
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 shrink-0 w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-14 shrink-0 hidden sm:block">
                    <Sparkline data={series.slice(-8)} color={emp.color} width={56} height={20} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Forecast */}
        <div className="glass-strong p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Budget Forecast
            </p>
            <span className="text-[10px] text-slate-500">
              based on last 7 days of burn
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {agentList.map((emp) => {
              const dl = daysLeft(emp)
              const date = projectedDate(emp)
              const pct = Math.round((emp.tokens_used / emp.budget) * 100)
              const urgent = dl !== null && dl <= 7
              const warning = dl !== null && dl > 7 && dl <= 30
              return (
                <div
                  key={emp.id}
                  data-forecast-row={emp.id}
                  className="px-3 py-2.5 rounded-xl bg-white/3 border border-white/5"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{emp.avatar}</span>
                    <p className="text-xs font-semibold text-white truncate flex-1">{emp.name}</p>
                    {urgent && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, pct)}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{
                        background:
                          pct > 80
                            ? 'linear-gradient(90deg, #f43f5e, #ef4444)'
                            : pct > 50
                              ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                              : `linear-gradient(90deg, ${emp.color}, ${emp.color}99)`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">{pct}% of budget</span>
                    <span
                      className={`text-[10px] font-semibold ${
                        urgent ? 'text-rose-400' : warning ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {dl === null
                        ? 'stable'
                        : dl <= 0
                          ? 'budget exhausted'
                          : date
                            ? `~${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                            : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
