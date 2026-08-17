import { motion } from 'framer-motion'
import { Zap, ArrowRight, Play, Shield, Activity, DollarSign } from 'lucide-react'

const floatingAgents = [
  { emoji: '🎯', label: 'CEO', delay: 0, x: 15, y: 20 },
  { emoji: '📣', label: 'CMO', delay: 0.2, x: 75, y: 15 },
  { emoji: '💰', label: 'CFO', delay: 0.4, x: 85, y: 65 },
  { emoji: '⚙️', label: 'Admin', delay: 0.6, x: 10, y: 70 },
  { emoji: '🔥', label: 'Marketing', delay: 0.8, x: 50, y: 75 },
  { emoji: '📊', label: 'Analyst', delay: 1.0, x: 35, y: 10 },
]

const features = [
  { icon: Shield, title: 'Governance', desc: 'Approval gates & budget controls' },
  { icon: Activity, title: 'Heartbeats', desc: 'Agents wake on schedule' },
  { icon: DollarSign, title: 'Cost Control', desc: 'Token budgets per agent' },
]

export function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Floating agent particles */}
      {floatingAgents.map((agent, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.6, 0.3, 0.6],
            scale: [0, 1, 0.9, 1],
            y: [0, -10, 5, -10, 0],
          }}
          transition={{
            duration: 4,
            delay: agent.delay,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="absolute text-3xl pointer-events-none select-none"
          style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
        >
          <div className="relative">
            <span>{agent.emoji}</span>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap font-medium">
              {agent.label}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Glow rings */}
      <div className="absolute w-[500px] h-[500px] rounded-full border border-indigo-500/10 animate-pulse" />
      <div className="absolute w-[700px] h-[700px] rounded-full border border-indigo-500/5" />
      <div className="absolute w-[300px] h-[300px] rounded-full border border-purple-500/10" />

      {/* Center content */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center relative z-10 max-w-2xl"
      >
        {/* Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6"
        >
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-medium text-indigo-300">
            AI Agent Orchestration
          </span>
        </motion.div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
          <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
            Run your company
          </span>
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            with AI agents
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
          Orchestrate teams of AI agents with org charts, budgets, governance,
          and goal alignment. If it can receive a heartbeat, it's hired.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGetStarted}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            Launch Dashboard
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm hover:bg-white/8 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4" />
            Watch Demo
          </motion.button>
        </div>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {features.map((feat, i) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/3"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-slate-400">{feat.title}</span>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
