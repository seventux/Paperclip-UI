import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useDraggable } from '@dnd-kit/core'
import { useStore } from '../store/useStore'
import { Sparkline, generateSparkData } from './Sparkline'
import type { OrgEmployee } from '../types'

interface OrgNodeProps {
  employee: OrgEmployee
  isDropTarget?: boolean
  compact?: boolean
}

export function OrgNode({ employee, isDropTarget, compact }: OrgNodeProps) {
  const { setSelectedEmployee, setActiveView, selectedEmployee, heartbeats } = useStore()
  const isSelected = selectedEmployee === employee.id
  const lastBeat = heartbeats[employee.id] ?? 0

  const sparkData = useMemo(
    () => generateSparkData(employee.tokens_used / 100),
    [employee.tokens_used]
  )

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: employee.id,
      data: { employee },
    })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  const budgetPercent = Math.round(
    (employee.tokens_used / employee.budget) * 100
  )

  const statusColor = {
    active: 'bg-emerald-400',
    idle: 'bg-amber-400',
    offline: 'bg-slate-500',
  }[employee.status]

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      {...listeners}
      {...attributes}
      onClick={() => {
        setSelectedEmployee(employee.id)
        setActiveView('agent')
      }}
      className={`
        relative cursor-grab active:cursor-grabbing select-none
        ${compact ? 'p-3' : 'p-4'}
        rounded-2xl transition-all duration-300
        ${isDragging ? 'z-50 opacity-80 scale-105' : 'z-10'}
        ${isDropTarget ? 'drag-over-indicator' : ''}
        ${isSelected ? 'glow ring-2 ring-indigo-500/50' : ''}
        backdrop-blur-xl border
        ${isSelected ? 'border-indigo-500/30 bg-white/8' : 'border-white/8 bg-white/5'}
        hover:border-white/15 hover:bg-white/8 hover:shadow-lg hover:shadow-indigo-500/5
      `}
    >
      {/* Glow accent at top */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, ${employee.color}, transparent)`,
        }}
      />

      {/* Heartbeat pulse ring for active agents */}
      {employee.status === 'active' && (
        <div className="absolute -top-1 -right-1 z-20">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: employee.color }}
          />
          <div
            className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-40"
            style={{ background: employee.color }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: `${employee.color}20` }}
          >
            {employee.avatar}
          </div>
          {employee.status === 'active' && (
            <div
              className="absolute inset-0 rounded-xl animate-pulse opacity-20"
              style={{ background: employee.color }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white truncate">
              {employee.name}
            </h3>
            {/* Status dot pulses on every realtime heartbeat */}
            <motion.div
              key={lastBeat || 'static'}
              initial={lastBeat ? { scale: 1.8, opacity: 0.3 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className={`w-2 h-2 rounded-full ${statusColor} shrink-0`}
            />
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {employee.title}
          </p>
        </div>
      </div>

      {/* Budget bar + sparkline */}
      {!compact && (
        <div className="mt-3 flex items-end gap-3">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-slate-500">Token Usage</span>
              <span className="text-[10px] text-slate-400">{budgetPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${budgetPercent}%` }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background:
                    budgetPercent > 80
                      ? 'linear-gradient(90deg, #f43f5e, #ef4444)'
                      : budgetPercent > 50
                        ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                        : `linear-gradient(90deg, ${employee.color}, ${employee.color}99)`,
                }}
              />
            </div>
          </div>
          <div className="shrink-0 opacity-60">
            <Sparkline data={sparkData} color={employee.color} width={48} height={18} />
          </div>
        </div>
      )}

      {/* Children count */}
      {!compact && employee.children.length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-[10px] text-slate-500">
            {employee.children.length} direct report
            {employee.children.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </motion.div>
  )
}
