import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'

export function CostChart() {
  const { employees } = useStore()
  const agentList = Object.values(employees).sort(
    (a, b) => b.tokens_used - a.tokens_used
  )

  const maxTokens = Math.max(...agentList.map((e) => e.tokens_used))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-strong p-4"
    >
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
        Token Usage by Agent
      </p>
      <div className="flex items-end gap-2 h-24">
        {agentList.map((emp, i) => {
          const height = (emp.tokens_used / maxTokens) * 100
          return (
            <div key={emp.id} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="w-full rounded-t-md relative group cursor-pointer"
                style={{
                  background: `linear-gradient(to top, ${emp.color}60, ${emp.color})`,
                }}
              >
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-[9px] text-[#fff] whitespace-nowrap">
                    {(emp.tokens_used / 1000).toFixed(0)}K
                  </div>
                </div>
              </motion.div>
              <span className="text-[8px] text-slate-500 truncate w-full text-center">
                {emp.avatar}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
