import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Bot, Sparkles, Check } from 'lucide-react'
import { useStore } from '../store/useStore'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

const agentPresets = [
  { emoji: '🤖', name: 'Engineer', color: '#6366f1', role: 'Software Engineer' },
  { emoji: '🎨', name: 'Designer', color: '#ec4899', role: 'UI/UX Designer' },
  { emoji: '📝', name: 'Writer', color: '#a78bfa', role: 'Content Writer' },
  { emoji: '📊', name: 'Analyst', color: '#10b981', role: 'Data Analyst' },
  { emoji: '🔍', name: 'Researcher', color: '#f59e0b', role: 'Research Analyst' },
  { emoji: '🛡️', name: 'Security', color: '#ef4444', role: 'Security Engineer' },
  { emoji: '📞', name: 'Support', color: '#14b8a6', role: 'Customer Support' },
  { emoji: '📈', name: 'Growth', color: '#f97316', role: 'Growth Engineer' },
]

const steps = ['Select Role', 'Configure', 'Review']

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [agentName, setAgentName] = useState('')
  const [budget, setBudget] = useState('100000')
  const [reportsTo, setReportsTo] = useState('ceo')
  const { employees, addEmployee } = useStore()

  const handleAdd = () => {
    if (!selectedPreset || !agentName) return
    const preset = agentPresets[selectedPreset]
    const id = agentName.toLowerCase().replace(/\s+/g, '_')

    addEmployee({
      id,
      name: agentName,
      role: preset.role,
      title: preset.role,
      avatar: preset.emoji,
      color: preset.color,
      status: 'idle',
      tokens_used: 0,
      budget: parseInt(budget) || 100000,
      reports_to: reportsTo,
      children: [],
    })

    // Reset and close
    setCurrentStep(0)
    setSelectedPreset(null)
    setAgentName('')
    setBudget('100000')
    setReportsTo('ceo')
    onClose()
  }

  const canProceed = () => {
    if (currentStep === 0) return selectedPreset !== null
    if (currentStep === 1) return agentName.length > 0
    return true
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[520px] max-h-[80vh] overflow-hidden rounded-3xl backdrop-blur-2xl bg-[rgba(15,15,30,0.95)] border border-white/10 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Hire New Agent</h2>
                  <p className="text-xs text-slate-400">
                    Add an AI agent to your organization
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2 px-6 mb-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < currentStep
                        ? 'bg-emerald-500 text-white'
                        : i === currentStep
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white/5 text-slate-500'
                    }`}
                  >
                    {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span
                    className={`text-xs ${
                      i <= currentStep ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {step}
                  </span>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-px bg-white/10 mx-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 min-h-[300px]">
              <AnimatePresence mode="wait">
                {currentStep === 0 && (
                  <motion.div
                    key="step-0"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <p className="text-sm text-slate-400 mb-4">
                      Choose a role for your new agent:
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {agentPresets.map((preset, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedPreset(i)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedPreset === i
                              ? 'border-indigo-500/40 bg-indigo-500/10'
                              : 'border-white/8 bg-white/3 hover:bg-white/5'
                          }`}
                        >
                          <div className="text-2xl mb-1">{preset.emoji}</div>
                          <p className="text-xs font-medium text-white">
                            {preset.name}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 block font-semibold">
                        Agent Name
                      </label>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="e.g., Pixel, Sage, Blaze..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 block font-semibold">
                        Monthly Token Budget
                      </label>
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 block font-semibold">
                        Reports To
                      </label>
                      <select
                        value={reportsTo}
                        onChange={(e) => setReportsTo(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none"
                      >
                        {Object.values(employees).map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.avatar} {emp.name} — {emp.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <div className="glass-strong p-4 text-center">
                      <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-white mb-1">
                        Ready to Hire!
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Your new agent will join the org chart and start receiving
                        tasks.
                      </p>
                      <div className="glass p-3 rounded-xl text-left mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {selectedPreset !== null
                              ? agentPresets[selectedPreset].emoji
                              : '🤖'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">
                              {agentName || 'Unnamed'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {selectedPreset !== null
                                ? agentPresets[selectedPreset].role
                                : 'Agent'}
                              {' → '}
                              {employees[reportsTo]?.name || 'CEO'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 pt-0">
              <button
                onClick={() =>
                  currentStep > 0
                    ? setCurrentStep(currentStep - 1)
                    : onClose()
                }
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                {currentStep > 0 ? 'Back' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  if (currentStep < 2) {
                    setCurrentStep(currentStep + 1)
                  } else {
                    handleAdd()
                  }
                }}
                disabled={!canProceed()}
                className={`flex items-center gap-1 px-5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  canProceed()
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                }`}
              >
                {currentStep < 2 ? 'Next' : 'Hire Agent'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
