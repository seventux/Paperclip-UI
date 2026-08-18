import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Activity,
  Coins,
  HeartPulse,
  ListTodo,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  Users,
  MessageCircle,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Sparkline, generateSparkData } from './Sparkline'
import type { OrgEmployee } from '../types'

interface ActivityEntry {
  id: string
  time: string
  text: string
  kind: 'heartbeat' | 'task' | 'token' | 'status' | 'system'
}

const statusConfig = {
  active: { label: 'Active', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  idle: { label: 'Idle', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
  offline: { label: 'Offline', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' },
}

const taskStatusConfig = {
  todo: { icon: Circle, label: 'To Do', color: '#94a3b8' },
  'in-progress': { icon: Clock, label: 'In Progress', color: '#6366f1' },
  review: { icon: AlertCircle, label: 'Review', color: '#f59e0b' },
  done: { icon: CheckCircle2, label: 'Done', color: '#10b981' },
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.max(1, Math.round(diff / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function buildInitialActivity(emp: OrgEmployee, tasks: ReturnType<typeof useStore.getState>['tasks']): ActivityEntry[] {
  const entries: ActivityEntry[] = []
  const now = Date.now()
  const myTasks = tasks.filter((t) => t.assignee === emp.id)

  if (emp.status === 'active') {
    entries.push({
      id: 'a-heartbeat',
      time: timeAgo(now - 2 * 60000),
      text: 'Heartbeat received — agent is online',
      kind: 'heartbeat',
    })
  }
  myTasks.forEach((task, i) => {
    entries.push({
      id: `a-task-${task.id}`,
      time: timeAgo(now - (i + 3) * 60000),
      text: `Task "${task.title}" → ${task.status.replace('-', ' ')}`,
      kind: 'task',
    })
  })
  entries.push({
    id: 'a-token',
    time: timeAgo(now - 45 * 60000),
    text: `Token usage updated — ${(emp.tokens_used / 1000).toFixed(1)}K total`,
    kind: 'token',
  })
  entries.push({
    id: 'a-status',
    time: timeAgo(now - 3 * 3600000),
    text: `Status changed to ${emp.status}`,
    kind: 'status',
  })
  entries.push({
    id: 'a-system',
    time: timeAgo(now - 26 * 3600000),
    text: 'Agent provisioned with heartbeat schedule',
    kind: 'system',
  })
  return entries
}

export function AgentDetail() {
  const {
    employees,
    tasks,
    selectedEmployee,
    setActiveView,
    heartbeats,
    updateEmployeeBudget,
    openChat,
  } = useStore()
  const emp = selectedEmployee ? employees[selectedEmployee] : null

  const [budgetInput, setBudgetInput] = useState<string>('')
  const [saved, setSaved] = useState(false)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const lastBeatRef = useRef(0)

  // Reset local state whenever a different agent is opened
  useEffect(() => {
    if (!emp) return
    setBudgetInput(String(emp.budget))
    setSaved(false)
    setActivity(buildInitialActivity(emp, tasks))
    lastBeatRef.current = heartbeats[emp.id] ?? 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emp?.id])

  // Prepend a heartbeat entry every time a realtime heartbeat arrives
  useEffect(() => {
    if (!emp) return
    const last = heartbeats[emp.id] ?? 0
    if (last > lastBeatRef.current) {
      lastBeatRef.current = last
      setActivity((prev) =>
        (
          [
            {
              id: `a-beat-${last}`,
              time: 'just now',
              text: 'Heartbeat received — agent is online',
              kind: 'heartbeat',
            } as ActivityEntry,
            ...prev,
          ]
        ).slice(0, 14)
      )
    }
  }, [heartbeats, emp])

  const sparkData = useMemo(
    () => (emp ? generateSparkData(emp.tokens_used / 140, 20) : []),
    [emp?.tokens_used] // eslint-disable-line react-hooks/exhaustive-deps
  )

  if (!emp) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-slate-400">Select an agent to see their details</p>
          <button
            onClick={() => setActiveView('org')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/15 text-indigo-300 text-sm font-medium border border-indigo-500/20 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Org Chart
          </button>
        </div>
      </div>
    )
  }

  const status = statusConfig[emp.status]
  const manager = emp.reports_to ? employees[emp.reports_to] : null
  const myTasks = tasks.filter((t) => t.assignee === emp.id)
  const budgetPercent = Math.round((emp.tokens_used / emp.budget) * 100)
  const lastBeat = heartbeats[emp.id]

  const saveBudget = () => {
    const value = parseInt(budgetInput, 10)
    if (!Number.isNaN(value) && value > 0 && value !== emp.budget) {
      updateEmployeeBudget(emp.id, value)
    } else if (Number.isNaN(value) || value <= 0) {
      setBudgetInput(String(emp.budget))
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-auto p-4 md:p-6"
    >
      {/* Back */}
      <button
        onClick={() => setActiveView('org')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Org Chart
      </button>

      {/* Header card */}
      <div className="glass-strong p-5 md:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{ background: `${emp.color}20` }}
          >
            {emp.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-white">{emp.name}</h2>
              <span
                className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-lg"
                style={{ color: status.color, background: status.bg }}
              >
                {status.label}
              </span>
              {lastBeat && emp.status !== 'offline' && (
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <HeartPulse className="w-3 h-3" style={{ color: emp.color }} />
                  beat {timeAgo(lastBeat)}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {emp.title} · {emp.role}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              {emp.children.length} direct reports
            </div>
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-slate-500" />
              {(emp.tokens_used / 1000).toFixed(1)}K / {(emp.budget / 1000).toFixed(0)}K tokens
            </div>
            <button
              onClick={() => openChat(emp.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-xs font-medium hover:bg-indigo-500/25 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat
            </button>
          </div>
        </div>

        {/* Budget bar */}
        <div className="mt-4">
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, budgetPercent)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background:
                  budgetPercent > 80
                    ? 'linear-gradient(90deg, #f43f5e, #ef4444)'
                    : budgetPercent > 50
                      ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                      : `linear-gradient(90deg, ${emp.color}, ${emp.color}99)`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {budgetPercent}% of token budget used
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: activity + tasks */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Activity timeline */}
          <div className="glass-strong p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-indigo-400" />
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Activity Log
              </p>
            </div>
            <div className="relative pl-4">
              <div className="absolute left-0 top-1 bottom-1 w-px bg-white/8" />
              <div className="flex flex-col gap-3">
                {activity.map((entry) => (
                  <div key={entry.id} className="relative flex items-start gap-3">
                    <div
                      className="absolute -left-4 top-1.5 w-2 h-2 rounded-full"
                      style={{
                        background:
                          entry.kind === 'heartbeat'
                            ? emp.color
                            : entry.kind === 'task'
                              ? '#6366f1'
                              : entry.kind === 'token'
                                ? '#10b981'
                                : '#94a3b8',
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-300">{entry.text}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{entry.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task assignments */}
          <div className="glass-strong p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListTodo className="w-4 h-4 text-indigo-400" />
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Task Assignments ({myTasks.length})
              </p>
            </div>
            {myTasks.length === 0 ? (
              <p className="text-xs text-slate-500">No tasks assigned yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {myTasks.map((task) => {
                  const config = taskStatusConfig[task.status]
                  const Icon = config.icon
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 border border-white/5"
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: config.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{task.title}</p>
                        <p className="text-[10px] text-slate-500">{config.label}</p>
                      </div>
                      <span
                        className={`text-[10px] font-medium uppercase shrink-0 ${
                          task.priority === 'high'
                            ? 'text-rose-400'
                            : task.priority === 'medium'
                              ? 'text-amber-400'
                              : 'text-slate-500'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: chart, budget, heartbeat config */}
        <div className="flex flex-col gap-4">
          {/* Token usage history */}
          <div className="glass-strong p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-400" />
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                  Token Usage
                </p>
              </div>
              <span className="text-xs font-semibold text-white">
                {(emp.tokens_used / 1000).toFixed(1)}K
              </span>
            </div>
            {sparkData.length > 1 && (
              <Sparkline data={sparkData} color={emp.color} width={280} height={110} responsive />
            )}
            <p className="text-[10px] text-slate-500 mt-2">
              Historical trend (last 20 intervals)
            </p>
          </div>

          {/* Budget settings */}
          <div className="glass-strong p-4">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4 text-indigo-400" />
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Budget Settings
              </p>
            </div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
              Monthly Token Budget
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
              <button
                onClick={saveBudget}
                className="px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/25 transition-colors cursor-pointer"
              >
                {saved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              {manager ? `Reports to ${manager.name}` : 'Top of the org chart'}
            </p>
          </div>

          {/* Heartbeat schedule config */}
          <div className="glass-strong p-4">
            <div className="flex items-center gap-2 mb-3">
              <HeartPulse className="w-4 h-4 text-indigo-400" />
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Heartbeat Schedule
              </p>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/3 border border-white/5">
                <span className="text-slate-500">Interval</span>
                <span className="text-white font-medium">
                  {emp.status === 'active' ? 'Every 30s' : 'Paused'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/3 border border-white/5">
                <span className="text-slate-500">Last heartbeat</span>
                <span className="text-white font-medium">
                  {lastBeat ? timeAgo(lastBeat) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/3 border border-white/5">
                <span className="text-slate-500">Wake on schedule</span>
                <span className="flex items-center gap-1.5">
                  <div
                    className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                      emp.status !== 'offline' ? 'bg-emerald-500/40' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white transition-transform ${
                        emp.status !== 'offline' ? 'translate-x-3' : ''
                      }`}
                    />
                  </div>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
