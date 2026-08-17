import { useState, useRef, useEffect } from 'react'
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
  Save,
  FolderOpen,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ListOrdered,
  CornerDownRight,
  Trash,
} from 'lucide-react'
import { paperclip } from '../api/paperclip'

type StepType = 'trigger' | 'agent' | 'condition' | 'action'
type ErrorPolicy = 'stop' | 'continue' | 'retry'
type Branch = 'main' | 'yes' | 'no'

interface ConnectorStep {
  id: string
  type: StepType
  label: string
  config: string
  enabled: boolean
  /** Execution branch: main flow, or the yes/no output of the nearest condition above */
  branch: Branch
  /** What to do when this step fails during a run */
  onError: ErrorPolicy
  /** Simulate a failure during the run (for demoing error handling) */
  simulateError: boolean
  /** Which branch a condition step resolves to when evaluated */
  conditionOutcome: 'yes' | 'no'
}

type StepRunStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped'

interface LogEntry {
  id: string
  time: string
  stepId: string | null
  stepLabel: string
  status: 'running' | 'success' | 'error' | 'skipped' | 'info'
  message: string
}

interface WorkflowTemplate {
  name: string
  description: string
  steps: ConnectorStep[]
}

const STORAGE_KEY = 'paperclip-workflow'

let stepCounter = 0
const makeStep = (
  type: StepType,
  overrides: Partial<ConnectorStep> = {}
): ConnectorStep => {
  stepCounter += 1
  return {
    id: `step-${Date.now()}-${stepCounter}`,
    type,
    label: `New ${type}`,
    config: 'Configure...',
    enabled: true,
    branch: 'main',
    onError: 'continue',
    simulateError: false,
    conditionOutcome: 'yes',
    ...overrides,
  }
}

const templates: WorkflowTemplate[] = [
  {
    name: 'Heartbeat Monitor',
    description: 'Track agent heartbeats and log activity',
    steps: [
      makeStep('trigger', { label: 'Heartbeat Trigger', config: 'Every 30 minutes' }),
      makeStep('condition', { label: 'Budget Check', config: 'tokens_used < budget * 0.8' }),
      makeStep('agent', { label: 'Execute Agent Task', config: 'Atlas (CEO)' }),
      makeStep('action', { label: 'Log Activity', config: 'Write to audit trail' }),
    ],
  },
  {
    name: 'Budget Alert',
    description: 'Notify when an agent burns through its budget',
    steps: [
      makeStep('trigger', { label: 'Budget Threshold', config: 'tokens_used > budget * 0.9' }),
      makeStep('condition', {
        label: 'Spend Check',
        config: 'budget_remaining < 10%',
        conditionOutcome: 'yes',
      }),
      makeStep('agent', {
        label: 'Notify CFO',
        config: 'Ledger (CFO)',
        branch: 'yes',
      }),
      makeStep('action', { label: 'Send Alert', config: 'Email + Slack', branch: 'yes' }),
      makeStep('action', { label: 'Log Normal Spend', config: 'Audit trail only', branch: 'no' }),
    ],
  },
  {
    name: 'Task Assignment',
    description: 'Route new tasks to the right agent',
    steps: [
      makeStep('trigger', { label: 'New Task', config: 'On task created' }),
      makeStep('condition', {
        label: 'Has Assignee?',
        config: 'task.assignee != null',
      }),
      makeStep('agent', { label: 'Run Agent Task', config: 'Assigned agent', branch: 'yes' }),
      makeStep('agent', {
        label: 'Auto-assign',
        config: 'Round-robin pool',
        branch: 'no',
      }),
      makeStep('action', { label: 'Notify Team', config: 'Post to channel' }),
    ],
  },
]

function loadSavedSteps(): ConnectorStep[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConnectorStep[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed.map((s) => ({
      id: s.id || `step-${Date.now()}-${Math.random()}`,
      type: s.type,
      label: s.label || 'Untitled step',
      config: s.config || '',
      enabled: s.enabled !== false,
      branch: s.branch || 'main',
      onError: s.onError || 'continue',
      simulateError: !!s.simulateError,
      conditionOutcome: s.conditionOutcome || 'yes',
    }))
  } catch {
    return null
  }
}

const stepConfig: Record<StepType, { icon: typeof Webhook; color: string; label: string }> = {
  trigger: { icon: Webhook, color: '#6366f1', label: 'Trigger' },
  agent: { icon: Bot, color: '#ec4899', label: 'Agent' },
  condition: { icon: GitBranch, color: '#f59e0b', label: 'Condition' },
  action: { icon: Zap, color: '#10b981', label: 'Action' },
}

const branchColor: Record<Branch, string> = {
  main: 'rgba(148,163,184,0.4)',
  yes: '#34d399',
  no: '#fbbf24',
}

const branchLabel: Record<Branch, string> = {
  main: 'Main flow',
  yes: 'Yes branch',
  no: 'No branch',
}

const statusMeta = {
  running: { icon: Loader2, color: '#6366f1', label: 'Running' },
  success: { icon: CheckCircle2, color: '#34d399', label: 'Success' },
  error: { icon: XCircle, color: '#f87171', label: 'Failed' },
  skipped: { icon: X, color: '#64748b', label: 'Skipped' },
  info: { icon: null, color: '#94a3b8', label: 'Info' },
  idle: { icon: null, color: '#64748b', label: 'Idle' },
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function ConnectorConfig() {
  const [steps, setSteps] = useState<ConnectorStep[]>(() => loadSavedSteps() ?? templates[0].steps)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [rightPanel, setRightPanel] = useState<'config' | 'log'>('config')
  const [stepStatus, setStepStatus] = useState<Record<string, StepRunStatus>>({})
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const runIdRef = useRef(0)
  const logScrollRef = useRef<HTMLDivElement>(null)

  // Cancel any in-flight run when the component unmounts
  useEffect(() => {
    return () => {
      runIdRef.current += 1
    }
  }, [])

  // Auto-scroll the execution log to the newest entry
  useEffect(() => {
    const el = logScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  const saveWorkflow = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(steps))
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const loadTemplate = (template: WorkflowTemplate) => {
    setSteps(template.steps.map((s) => ({ ...s, id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })))
    setSelectedStep(null)
    setTemplatesOpen(false)
    setStepStatus({})
    setLogs([])
  }

  const resetWorkflow = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSteps(templates[0].steps.map((s) => ({ ...s, id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })))
    setSelectedStep(null)
    setStepStatus({})
    setLogs([])
  }

  const clearLogs = () => {
    setLogs([])
  }

  const addStep = (type: StepType) => {
    const newStep = makeStep(type)
    setSteps([...steps, newStep])
    setSelectedStep(newStep.id)
    setRightPanel('config')
  }

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id))
    if (selectedStep === id) setSelectedStep(null)
  }

  const toggleStep = (id: string) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))
  }

  const updateStep = (id: string, patch: Partial<ConnectorStep>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  /**
   * Simulated pipeline execution. Steps run in order; condition steps gate the
   * branch of the steps below them, error policies decide how failures behave,
   * and the whole run is mirrored (best-effort) to the Paperclip routines API.
   */
  const runWorkflow = async () => {
    if (isRunning) {
      // Stop: cancel the current run
      runIdRef.current += 1
      setIsRunning(false)
      return
    }

    setIsRunning(true)
    setRightPanel('log')
    const runId = ++runIdRef.current
    const snapshot = [...steps]
    setStepStatus({})

    const freshLogs: LogEntry[] = []
    const log = (entry: Omit<LogEntry, 'id' | 'time'>) => {
      if (runIdRef.current !== runId) return
      freshLogs.push({
        ...entry,
        id: `log-${runId}-${freshLogs.length}`,
        time: new Date().toLocaleTimeString(),
      })
      setLogs([...freshLogs])
    }

    log({
      status: 'info',
      stepId: null,
      stepLabel: 'Workflow',
      message: `Run started (${snapshot.filter((s) => s.enabled).length} active steps)`,
    })

    // Best-effort sync to the Paperclip routines API — silently falls back
    // to local simulation when the server is unreachable.
    const payload = snapshot.map(({ id, type, label, config, enabled, branch, onError }) => ({
      id,
      type,
      label,
      config,
      enabled,
      branch,
      onError,
    }))
    paperclip.runRoutine('workflow', { steps: payload }).then((res) => {
      if (runIdRef.current !== runId) return
      log({
        status: res ? 'success' : 'info',
        stepId: null,
        stepLabel: 'Paperclip',
        message: res
          ? 'Executed on Paperclip server'
          : 'Server offline — running simulated locally',
      })
    })

    let conditionOutcome: 'yes' | 'no' | null = null

    for (let i = 0; i < snapshot.length; i += 1) {
      const step = snapshot[i]
      if (runIdRef.current !== runId) return

      if (!step.enabled) {
        setStepStatus((s) => ({ ...s, [step.id]: 'skipped' }))
        log({ status: 'skipped', stepId: step.id, stepLabel: step.label, message: 'Disabled — skipped' })
        continue
      }

      // Branch gating: after a condition, only steps on the taken branch run
      if (conditionOutcome && step.branch !== 'main' && step.branch !== conditionOutcome) {
        setStepStatus((s) => ({ ...s, [step.id]: 'skipped' }))
        log({
          status: 'skipped',
          stepId: step.id,
          stepLabel: step.label,
          message: `Branch "${step.branch}" not taken (condition resolved "${conditionOutcome}") — skipped`,
        })
        continue
      }

      if (step.type === 'condition') {
        conditionOutcome = step.conditionOutcome
        log({
          status: 'info',
          stepId: step.id,
          stepLabel: step.label,
          message: `Evaluated → "${step.conditionOutcome}"`,
        })
      }

      setStepStatus((s) => ({ ...s, [step.id]: 'running' }))
      log({ status: 'running', stepId: step.id, stepLabel: step.label, message: `Executing — ${step.config}` })
      await delay(350 + Math.random() * 550)
      if (runIdRef.current !== runId) return

      if (step.simulateError) {
        setStepStatus((s) => ({ ...s, [step.id]: 'error' }))
        log({
          status: 'error',
          stepId: step.id,
          stepLabel: step.label,
          message: `Failed (simulated error, policy: ${step.onError})`,
        })

        if (step.onError === 'stop') {
          // Abort the workflow; everything after is skipped
          for (let j = i + 1; j < snapshot.length; j += 1) {
            setStepStatus((s) => ({ ...s, [snapshot[j].id]: 'skipped' }))
            log({
              status: 'skipped',
              stepId: snapshot[j].id,
              stepLabel: snapshot[j].label,
              message: 'Skipped — workflow aborted by error policy',
            })
          }
          log({ status: 'info', stepId: null, stepLabel: 'Workflow', message: 'Aborted by "stop" error policy' })
          break
        }

        if (step.onError === 'retry') {
          setStepStatus((s) => ({ ...s, [step.id]: 'running' }))
          log({ status: 'running', stepId: step.id, stepLabel: step.label, message: 'Retrying…' })
          await delay(450)
          if (runIdRef.current !== runId) return
          setStepStatus((s) => ({ ...s, [step.id]: 'success' }))
          log({ status: 'success', stepId: step.id, stepLabel: step.label, message: 'Succeeded on retry' })
          continue
        }

        // continue: log the failure and keep going
        log({ status: 'info', stepId: null, stepLabel: 'Workflow', message: 'Continuing past error (policy: continue)' })
        continue
      }

      setStepStatus((s) => ({ ...s, [step.id]: 'success' }))
      log({ status: 'success', stepId: step.id, stepLabel: step.label, message: 'Completed' })
    }

    if (runIdRef.current === runId) {
      setIsRunning(false)
      log({ status: 'info', stepId: null, stepLabel: 'Workflow', message: 'Run finished' })
    }
  }

  const selected = steps.find((s) => s.id === selectedStep) || null

  // On mobile the sidebar overlays the pipeline, so only show it when there
  // is something worth looking at (a selected step or a live/filled log).
  const sidebarVisible =
    selectedStep !== null ||
    (rightPanel === 'log' && (logs.length > 0 || isRunning))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex-1 flex overflow-hidden relative"
    >
      {/* Pipeline builder */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-white">Workflow Pipeline</h2>
            <p className="text-sm text-slate-400 mt-1">
              Build automation flows like n8n — but for AI agents
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Run / Stop */}
            <button
              onClick={runWorkflow}
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

            {/* Save to localStorage */}
            <button
              onClick={saveWorkflow}
              title="Save workflow"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all cursor-pointer ${
                savedFlash
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                  : 'bg-white/5 text-slate-400 border-white/8 hover:text-white'
              }`}
            >
              {savedFlash ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{savedFlash ? 'Saved' : 'Save'}</span>
            </button>

            {/* Templates dropdown */}
            <div className="relative">
              <button
                onClick={() => setTemplatesOpen((v) => !v)}
                title="Load template"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-white/5 text-slate-400 border border-white/8 hover:text-white transition-all cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Templates</span>
              </button>
              <AnimatePresence>
                {templatesOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setTemplatesOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 top-full mt-2 z-30 w-64 glass-strong rounded-2xl p-2 shadow-2xl"
                    >
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-2 pt-1 pb-2">
                        Workflow Templates
                      </p>
                      {templates.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => loadTemplate(t)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/8 transition-colors cursor-pointer"
                        >
                          <p className="text-sm font-medium text-white">{t.name}</p>
                          <p className="text-[10px] text-slate-500">{t.description}</p>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Reset */}
            <button
              onClick={resetWorkflow}
              title="Reset to default"
              className="p-2 rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
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
            const status = stepStatus[step.id] || 'idle'
            const statusMetaFor = statusMeta[status]

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Connector line (colored by the branch of the step below) */}
                {idx > 0 && (
                  <div className="flex flex-col items-center py-1">
                    <ArrowDown
                      className="w-4 h-4"
                      style={{ color: branchColor[step.branch] }}
                    />
                    {step.branch !== 'main' && (
                      <span
                        className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ color: branchColor[step.branch], background: `${branchColor[step.branch]}1a` }}
                      >
                        <CornerDownRight className="w-2.5 h-2.5" />
                        {branchLabel[step.branch]}
                      </span>
                    )}
                  </div>
                )}

                {/* Step card */}
                <motion.div
                  layout
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: step.enabled ? 1 : 0.5 }}
                  onClick={() => {
                    setSelectedStep(step.id === selectedStep ? null : step.id)
                    setRightPanel('config')
                  }}
                  className={`
                    relative w-[min(360px,calc(100vw-2rem))] p-4 rounded-2xl backdrop-blur-xl border cursor-pointer transition-all
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded"
                          style={{ color: config.color, background: `${config.color}15` }}
                        >
                          {config.label}
                        </span>
                        {step.branch !== 'main' && (
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ color: branchColor[step.branch], background: `${branchColor[step.branch]}1a` }}
                          >
                            {step.branch === 'yes' ? '✓ Yes' : '✗ No'}
                          </span>
                        )}
                        {step.simulateError && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                            <AlertTriangle className="w-2.5 h-2.5" /> Error
                          </span>
                        )}
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
                      {/* Run status indicator */}
                      {status !== 'idle' && (
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: `${statusMetaFor.color}1a` }}
                          title={statusMetaFor.label}
                        >
                          {status === 'running' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: statusMetaFor.color }} />
                          ) : statusMetaFor.icon ? (
                            <statusMetaFor.icon className="w-3.5 h-3.5" style={{ color: statusMetaFor.color }} />
                          ) : null}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleStep(step.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        title={step.enabled ? 'Disable step' : 'Enable step'}
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
                        title="Remove step"
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
          <div className="flex gap-2 flex-wrap justify-center">
            {(['trigger', 'agent', 'condition', 'action'] as const).map((type) => {
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
            })}
          </div>
        </div>
      </div>

      {/* Right sidebar: step config / execution log */}
      <div
        className={`w-[300px] max-w-[85vw] p-4 border-l border-white/5 overflow-hidden flex flex-col max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:shadow-2xl max-lg:bg-(--modal-bg) ${
          sidebarVisible ? '' : 'max-lg:hidden'
        }`}
      >
        {/* Panel tabs */}
        <div className="flex gap-1 mb-4 shrink-0 items-center">
          <button
            onClick={() => setRightPanel('config')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              rightPanel === 'config'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                : 'bg-white/3 text-slate-400 border border-white/5 hover:text-white'
            }`}
          >
            <Settings className="w-3 h-3" /> Config
          </button>
          <button
            onClick={() => setRightPanel('log')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              rightPanel === 'log'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                : 'bg-white/3 text-slate-400 border border-white/5 hover:text-white'
            }`}
          >
            <Terminal className="w-3 h-3" /> Execution Log
            {logs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] flex items-center justify-center">
                {logs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setSelectedStep(null)
              setRightPanel('config')
            }}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer lg:hidden shrink-0"
            aria-label="Close panel"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {rightPanel === 'config' ? (
            <motion.div
              key="config"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-auto min-h-0"
            >
              {selected ? (
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
                      style={{ background: `${stepConfig[selected.type].color}20` }}
                    >
                      {(() => {
                        const Icon = stepConfig[selected.type].icon
                        return <Icon className="w-5 h-5" style={{ color: stepConfig[selected.type].color }} />
                      })()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{selected.label}</p>
                      <p className="text-[10px] text-slate-400">{stepConfig[selected.type].label}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                        Label
                      </label>
                      <input
                        type="text"
                        value={selected.label}
                        onChange={(e) => updateStep(selected.id, { label: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                        Configuration
                      </label>
                      <textarea
                        value={selected.config}
                        onChange={(e) => updateStep(selected.id, { config: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                      />
                    </div>

                    {selected.type === 'condition' && (
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                          Condition resolves to
                        </label>
                        <div className="flex gap-2">
                          {(['yes', 'no'] as const).map((outcome) => (
                            <button
                              key={outcome}
                              onClick={() => updateStep(selected.id, { conditionOutcome: outcome })}
                              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                selected.conditionOutcome === outcome
                                  ? outcome === 'yes'
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                                  : 'bg-white/3 text-slate-400 border-white/5 hover:text-white'
                              }`}
                            >
                              {outcome === 'yes' ? '✓ Yes' : '✗ No'}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1.5">
                          Steps assigned to this branch run when the condition matches.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                        Execution branch
                      </label>
                      <select
                        value={selected.branch}
                        onChange={(e) => updateStep(selected.id, { branch: e.target.value as Branch })}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-white focus:outline-none focus:border-indigo-500/50 [&>option]:bg-slate-900"
                      >
                        <option value="main">Main flow</option>
                        <option value="yes">Yes branch (after condition)</option>
                        <option value="no">No branch (after condition)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                        On error
                      </label>
                      <div className="flex gap-2">
                        {(['stop', 'continue', 'retry'] as const).map((policy) => (
                          <button
                            key={policy}
                            onClick={() => updateStep(selected.id, { onError: policy })}
                            className={`flex-1 px-2 py-2 rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                              selected.onError === policy
                                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
                                : 'bg-white/3 text-slate-400 border-white/5 hover:text-white'
                            }`}
                          >
                            {policy}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        {selected.onError === 'stop' && 'Abort the whole workflow on failure.'}
                        {selected.onError === 'continue' && 'Log the failure and move to the next step.'}
                        {selected.onError === 'retry' && 'Retry once before moving on.'}
                      </p>
                    </div>

                    <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/3 border border-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.simulateError}
                        onChange={(e) => updateStep(selected.id, { simulateError: e.target.checked })}
                        className="accent-amber-500"
                      />
                      <span className="text-xs text-slate-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Simulate failure on next run
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="glass-strong p-6 text-center text-slate-500 text-sm rounded-2xl">
                  <Settings className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  Select a step to edit its config.
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="log"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex items-center gap-2 mb-3 shrink-0">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                  Execution Log
                </span>
                {logs.length > 0 && (
                  <button
                    onClick={clearLogs}
                    className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-white/3 text-slate-500 hover:text-white text-[10px] transition-colors cursor-pointer"
                  >
                    <Trash className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              <div
                ref={logScrollRef}
                className="flex-1 overflow-auto space-y-1.5 pr-1 min-h-0"
              >
                {logs.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-10">
                    <ListOrdered className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    Press <span className="text-emerald-400 font-medium">Run</span> to execute the
                    pipeline and watch the log.
                  </div>
                ) : (
                  logs.map((entry) => {
                    const meta = statusMeta[entry.status] || statusMeta.info
                    const isInfo = entry.status === 'info'
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                          isInfo ? 'bg-white/2' : 'bg-white/3'
                        } border border-white/4`}
                      >
                        <span
                          className="mt-0.5 shrink-0 w-3.5 h-3.5 flex items-center justify-center"
                          style={{ color: meta.color }}
                        >
                          {entry.status === 'running' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : meta.icon ? (
                            <meta.icon className="w-3 h-3" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`text-[10px] font-medium truncate ${
                                isInfo ? 'text-slate-500' : 'text-slate-200'
                              }`}
                            >
                              {entry.stepLabel}
                            </span>
                            <span className="text-[9px] text-slate-600 shrink-0 ml-auto tabular-nums">
                              {entry.time}
                            </span>
                          </div>
                          <p className={`text-[10px] leading-snug mt-0.5 ${isInfo ? 'text-slate-500' : 'text-slate-400'}`}>
                            {entry.message}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
