import { motion } from 'framer-motion'
import {
  GitBranch,
  Workflow,
  CheckSquare,
  TrendingUp,
  DollarSign,
  Activity,
  Plus,
} from 'lucide-react'
import { useStore } from '../store/useStore'

const navItems = [
  { id: 'org' as const, icon: GitBranch, label: 'Org Chart' },
  { id: 'workflow' as const, icon: Workflow, label: 'Workflow' },
  { id: 'tasks' as const, icon: CheckSquare, label: 'Tasks' },
]

export function Sidebar() {
  const { activeView, setActiveView, employees, tasks } = useStore()
  const agentList = Object.values(employees)
  const totalTokens = agentList.reduce((sum, e) => sum + e.tokens_used, 0)
  const totalBudget = agentList.reduce((sum, e) => sum + e.budget, 0)
  const completedTasks = tasks.filter((t) => t.status === 'done').length

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-[220px] flex flex-col gap-4 p-4 shrink-0"
    >
      {/* Navigation */}
      <div className="glass-strong p-2">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 px-3 py-2 font-semibold">
          Navigation
        </p>
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="glass-strong p-3 flex flex-col gap-3">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 px-1 font-semibold">
          Overview
        </p>

        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{agentList.length}</p>
            <p className="text-[10px] text-slate-500">Agents</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {completedTasks}/{tasks.length}
            </p>
            <p className="text-[10px] text-slate-500">Tasks Done</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {(totalTokens / 1000).toFixed(0)}K
            </p>
            <p className="text-[10px] text-slate-500">
              /{(totalBudget / 1000).toFixed(0)}K tokens
            </p>
          </div>
        </div>
      </div>

      {/* Add Agent Button */}
      <button className="glass flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-indigo-300 hover:text-indigo-200 cursor-pointer">
        <Plus className="w-4 h-4" />
        Add Agent
      </button>
    </motion.aside>
  )
}
