import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

const statusConfig = {
  todo: { icon: Circle, label: 'To Do', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' },
  'in-progress': { icon: Clock, label: 'In Progress', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  review: { icon: AlertCircle, label: 'Review', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  done: { icon: CheckCircle2, label: 'Done', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
}

const priorityColors = {
  low: 'text-slate-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
}

export function TasksView() {
  const { tasks, employees } = useStore()

  const grouped = {
    todo: tasks.filter((t) => t.status === 'todo'),
    'in-progress': tasks.filter((t) => t.status === 'in-progress'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex-1 overflow-auto p-4 md:p-6"
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Task Board</h2>
        <p className="text-sm text-slate-400 mt-1">
          Track work across your AI team
        </p>
      </div>

      {/* Swipeable columns on mobile, fixed 4-column grid on desktop */}
      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0 h-[calc(100%-80px)]">
        {Object.entries(grouped).map(([status, items]) => {
          const config = statusConfig[status as keyof typeof statusConfig]
          const Icon = config.icon
          return (
            <div key={status} className="flex flex-col gap-3 min-w-[240px] md:min-w-0">
              {/* Column header */}
              <div className="glass-strong px-4 py-3 flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: config.color }} />
                <span className="text-sm font-semibold text-white">
                  {config.label}
                </span>
                <span className="ml-auto text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
                  {items.length}
                </span>
              </div>

              {/* Task cards */}
              <div className="flex flex-col gap-2 flex-1 overflow-auto">
                {items.map((task, idx) => {
                  const assignee = employees[task.assignee]
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass p-4 cursor-pointer"
                    >
                      <p className="text-sm font-medium text-white mb-2">
                        {task.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {assignee && (
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                                style={{ background: `${assignee.color}20` }}
                              >
                                {assignee.avatar}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {assignee.name}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-medium ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
