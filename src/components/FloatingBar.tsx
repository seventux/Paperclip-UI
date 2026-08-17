import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Users,
  Workflow,
  MessageSquare,
  BarChart3,
  X,
} from 'lucide-react'

interface QuickAction {
  icon: typeof Plus
  label: string
  color: string
  action: () => void
}

export function FloatingBar({
  onAddAgent,
  onShowOrg,
  onShowWorkflow,
}: {
  onAddAgent: () => void
  onShowOrg: () => void
  onShowWorkflow: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const actions: QuickAction[] = [
    {
      icon: Plus,
      label: 'Add Agent',
      color: '#6366f1',
      action: () => {
        onAddAgent()
        setIsOpen(false)
      },
    },
    {
      icon: Users,
      label: 'Org View',
      color: '#ec4899',
      action: () => {
        onShowOrg()
        setIsOpen(false)
      },
    },
    {
      icon: Workflow,
      label: 'Workflow',
      color: '#10b981',
      action: () => {
        onShowWorkflow()
        setIsOpen(false)
      },
    },
    {
      icon: MessageSquare,
      label: 'Quick Chat',
      color: '#f59e0b',
      action: () => setIsOpen(false),
    },
    {
      icon: BarChart3,
      label: 'Reports',
      color: '#8b5cf6',
      action: () => setIsOpen(false),
    },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Action buttons */}
      <AnimatePresence>
        {isOpen &&
          actions.map((action, i) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.label}
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.05 }}
                onClick={action.action}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl backdrop-blur-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-all cursor-pointer group shadow-xl"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${action.color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: action.color }} />
                </div>
                <span className="text-sm font-medium text-white whitespace-nowrap">
                  {action.label}
                </span>
              </motion.button>
            )
          })}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-2xl flex items-center justify-center
          shadow-2xl shadow-indigo-500/30 transition-all cursor-pointer
          ${isOpen
            ? 'bg-white/10 border border-white/15'
            : 'bg-gradient-to-br from-indigo-600 to-purple-600'
          }
        `}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <Plus className="w-5 h-5 text-[#fff]" />
        )}
      </motion.button>
    </div>
  )
}
