import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Webhook,
  Bot,
  GitBranch,
  Zap,
  ArrowDown,
  Settings,
  Play,
  Pause,
  RotateCcw,
  X,
} from 'lucide-react'

interface ConnectorStep {
  id: string
  type: 'trigger' | 'agent' | 'condition' | 'action'
  label: string
  config: string
  enabled: boolean
}

const defaultSteps: ConnectorStep[] = [
  {
    id: 'step-1',
    type: 'trigger',
    label: 'Heartbeat Trigger',
    config: 'Every 30 minutes',
    enabled: true,
  },
  {
    id: 'step-2',
    type: 'condition',
    label: 'Budget Check',
    config: 'tokens_used < budget * 0.8',
    enabled: true,
  },
  {
    id: 'step-3',
    type: 'agent',
    label: 'Execute Agent Task',
    config: 'Atlas (CEO)',
    enabled: true,
  },
  {
    id: 'step-4',
    type: 'action',
    label: 'Log Activity',
    config: 'Write to audit trail',
    enabled: true,
  },
]

const stepConfig = {
  trigger: { icon: Webhook, color: '#6366f1', label: 'Trigger' },
  agent: { icon: Bot, color: '#ec4899', label: 'Agent' },
  condition: { icon: GitBranch, color: '#f59e0b', label: 'Condition' },
  action: { icon: Zap, color: '#10b981', label: 'Action' },
}

export function ConnectorConfig() {
  const [steps, setSteps] = useState<ConnectorStep[]>(defaultSteps)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)

  const addStep = (type: ConnectorStep['type']) => {
    const newStep: ConnectorStep = {
      id: `step-${Date.now()}`,
      type,
      label: `New ${type}`,
      config: 'Configure...',
      enabled: true,
    }
    setSteps([...steps, newStep])
  }

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id))
    if (selectedStep === id) setSelectedStep(null)
  }

  const toggleStep = (id: string) => {
    setSteps(
      steps.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex-1 flex overflow-hidden relative"
    >
      {/* Pipeline builder */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Workflow Pipeline</h2>
            <p className="text-sm text-slate-400 mt-1">
              Build automation flows like n8n — but for AI agents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isRunning
                  ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Stop
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Run
                </>
              )}
            </button>
            <button className="p-2 rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col items-center gap-1">
          {steps.map((step, idx) => {
            const config = stepConfig[step.type]
            const Icon = config.icon
            const isActive = selectedStep === step.id

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Connector line */}
                {idx > 0 && (
                  <div className="flex flex-col items-center py-1">
                    <ArrowDown className="w-4 h-4 text-indigo-500/40" />
                  </div>
                )}

                {/* Step card */}
                <motion.div
                  layout
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: step.enabled ? 1 : 0.5 }}
                  onClick={() =>
                    setSelectedStep(step.id === selectedStep ? null : step.id)
                  }
                  className={`
                    relative w-[min(320px,calc(100vw-2rem))] p-4 rounded-2xl backdrop-blur-xl border cursor-pointer transition-all
                    ${
                      isActive
                        ? 'border-indigo-500/30 bg-indigo-500/5'
                        : 'border-white/8 bg-white/5 hover:bg-white/8'
                    }
                    ${!step.enabled ? 'opacity-50' : ''}
                  `}
                >
                  {/* Top accent */}
                  <div
                    className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
                    }}
                  />

                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${config.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            color: config.color,
                            background: `${config.color}15`,
                          }}
                        >
                          {config.label}
                        </span>
                        {!step.enabled && (
                          <span className="text-[9px] text-slate-500">Disabled</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white mt-0.5 truncate">
                        {step.label}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {step.config}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleStep(step.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        {step.enabled ? (
                          <div className="w-3 h-3 rounded-full bg-emerald-400" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-slate-600" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeStep(step.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )
          })}

          {/* Add step buttons */}
          <div className="flex flex-col items-center py-1">
            <ArrowDown className="w-4 h-4 text-indigo-500/20" />
          </div>
          <div className="flex gap-2">
            {(['trigger', 'agent', 'condition', 'action'] as const).map(
              (type) => {
                const config = stepConfig[type]
                const Icon = config.icon
                return (
                  <motion.button
                    key={type}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addStep(type)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/3 border border-dashed border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all text-xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </motion.button>
                )
              }
            )}
          </div>
        </div>
      </div>

      {/* Config sidebar */}
      <AnimatePresence>
        {selectedStep && (
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="w-[280px] max-w-[85vw] p-4 border-l border-white/5 overflow-auto max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:shadow-2xl max-lg:bg-[rgba(12,12,25,0.97)]"
          >
            {(() => {
              const step = steps.find((s) => s.id === selectedStep)
              if (!step) return null
              const config = stepConfig[step.type]
              const Icon = config.icon

              return (
                <div className="glass-strong p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                      Step Config
                    </span>
                    <button
                      onClick={() => setSelectedStep(null)}
                      className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer lg:hidden"
                      aria-label="Close config"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/3 border border-white/5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${config.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: config.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {step.label}
                      </p>
                      <p className="text-[10px] text-slate-400">{config.label}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                        Label
                      </label>
                      <input
                        type="text"
                        value={step.label}
                        onChange={(e) => {
                          setSteps(
                            steps.map((s) =>
                              s.id === step.id ? { ...s, label: e.target.value } : s
                            )
                          )
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                        Configuration
                      </label>
                      <textarea
                        value={step.config}
                        onChange={(e) => {
                          setSteps(
                            steps.map((s) =>
                              s.id === step.id ? { ...s, config: e.target.value } : s
                            )
                          )
                        }}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
