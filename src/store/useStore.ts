import { create } from 'zustand'
import type {
  OrgEmployee,
  Connection,
  Task,
  RealtimeEvent,
  RealtimeMode,
  ActiveView,
  AppNotification,
  ChatMessage,
  ChatToolCall,
} from '../types'

interface AppState {
  employees: Record<string, OrgEmployee>
  connections: Connection[]
  tasks: Task[]
  selectedEmployee: string | null
  draggedEmployee: string | null
  activeView: ActiveView
  realtimeMode: RealtimeMode
  heartbeats: Record<string, number>
  notifications: AppNotification[]
  chatThreads: Record<string, ChatMessage[]>
  chatOpen: boolean
  chatAgent: string | null
  openChat: (agentId?: string | null) => void
  closeChat: () => void
  setChatAgent: (agentId: string | null) => void
  sendAgentMessage: (agentId: string, text: string) => void
  clearChatThread: (agentId: string) => void
  setSelectedEmployee: (id: string | null) => void
  pushNotification: (notification: AppNotification) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void
  setDraggedEmployee: (id: string | null) => void
  setActiveView: (view: ActiveView) => void
  setRealtimeMode: (mode: RealtimeMode) => void
  updateEmployeeStatus: (id: string, status: OrgEmployee['status']) => void
  updateEmployeeTokens: (id: string, tokensUsed: number) => void
  updateEmployeeBudget: (id: string, budget: number) => void
  updateTaskStatus: (id: string, status: Task['status']) => void
  updateTaskAssignee: (id: string, assignee: string) => void
  recordHeartbeat: (id: string, timestamp: number) => void
  applyRealtimeEvent: (event: RealtimeEvent) => void
  reassignEmployee: (employeeId: string, newManagerId: string) => void
  addEmployee: (employee: OrgEmployee) => void
  removeEmployee: (id: string) => void
}

const initialEmployees: Record<string, OrgEmployee> = {
  ceo: {
    id: 'ceo',
    name: 'Atlas',
    role: 'CEO',
    title: 'Chief Executive Officer',
    avatar: '🎯',
    color: '#6366f1',
    status: 'active',
    tokens_used: 124500,
    budget: 500000,
    reports_to: null,
    children: ['cmo', 'cfo', 'admin'],
  },
  cmo: {
    id: 'cmo',
    name: 'Nova',
    role: 'CMO',
    title: 'Chief Marketing Officer',
    avatar: '📣',
    color: '#ec4899',
    status: 'active',
    tokens_used: 89200,
    budget: 200000,
    reports_to: 'ceo',
    children: ['marketing_lead', 'content_writers'],
  },
  cfo: {
    id: 'cfo',
    name: 'Ledger',
    role: 'CFO',
    title: 'Chief Financial Officer',
    avatar: '💰',
    color: '#10b981',
    status: 'active',
    tokens_used: 45600,
    budget: 150000,
    reports_to: 'ceo',
    children: ['analyst'],
  },
  admin: {
    id: 'admin',
    name: 'Aria',
    role: 'Admin',
    title: 'Operations Manager',
    avatar: '⚙️',
    color: '#f59e0b',
    status: 'idle',
    tokens_used: 23100,
    budget: 100000,
    reports_to: 'ceo',
    children: ['ops_lead'],
  },
  marketing_lead: {
    id: 'marketing_lead',
    name: 'Blaze',
    role: 'Marketing Lead',
    title: 'Campaign Manager',
    avatar: '🔥',
    color: '#f43f5e',
    status: 'active',
    tokens_used: 56700,
    budget: 100000,
    reports_to: 'cmo',
    children: [],
  },
  content_writers: {
    id: 'content_writers',
    name: 'Quill',
    role: 'Content Writer',
    title: 'Content Specialist',
    avatar: '✍️',
    color: '#a78bfa',
    status: 'idle',
    tokens_used: 34200,
    budget: 80000,
    reports_to: 'cmo',
    children: [],
  },
  analyst: {
    id: 'analyst',
    name: 'Sage',
    role: 'Analyst',
    title: 'Financial Analyst',
    avatar: '📊',
    color: '#14b8a6',
    status: 'active',
    tokens_used: 28900,
    budget: 75000,
    reports_to: 'cfo',
    children: [],
  },
  ops_lead: {
    id: 'ops_lead',
    name: 'Rivet',
    role: 'Ops Lead',
    title: 'Infrastructure Lead',
    avatar: '🔧',
    color: '#f97316',
    status: 'offline',
    tokens_used: 15400,
    budget: 60000,
    reports_to: 'admin',
    children: [],
  },
}

const initialConnections: Connection[] = [
  { id: 'c1', from: 'ceo', to: 'cmo', label: 'Manages', type: 'delegation' },
  { id: 'c2', from: 'ceo', to: 'cfo', label: 'Manages', type: 'delegation' },
  { id: 'c3', from: 'ceo', to: 'admin', label: 'Manages', type: 'delegation' },
  { id: 'c4', from: 'cmo', to: 'marketing_lead', label: 'Manages', type: 'delegation' },
  { id: 'c5', from: 'cmo', to: 'content_writers', label: 'Manages', type: 'delegation' },
  { id: 'c6', from: 'cfo', to: 'analyst', label: 'Manages', type: 'delegation' },
  { id: 'c7', from: 'admin', to: 'ops_lead', label: 'Manages', type: 'delegation' },
]

const MAX_NOTIFICATIONS = 50

function prependNotification(
  list: AppNotification[],
  notification: AppNotification
): AppNotification[] {
  return [notification, ...list].slice(0, MAX_NOTIFICATIONS)
}

const initialNotifications: AppNotification[] = [
  {
    id: 'n-seed-1',
    type: 'system',
    title: 'Welcome to Paperclip',
    message: 'Your AI team is online. Notifications will appear here in real time.',
    read: false,
    timestamp: Date.now() - 1000 * 60 * 5,
  },
  {
    id: 'n-seed-2',
    type: 'task',
    title: 'Task completed: SEO audit and optimization',
    message: 'Blaze finished the task.',
    employeeId: 'marketing_lead',
    read: true,
    timestamp: Date.now() - 1000 * 60 * 32,
  },
]

const initialTasks: Task[] = [
  { id: 't1', title: 'Launch Q3 marketing campaign', assignee: 'cmo', status: 'in-progress', priority: 'high' },
  { id: 't2', title: 'Prepare monthly budget report', assignee: 'cfo', status: 'review', priority: 'medium' },
  { id: 't3', title: 'Onboard new agent: Pixel', assignee: 'admin', status: 'todo', priority: 'low' },
  { id: 't4', title: 'SEO audit and optimization', assignee: 'marketing_lead', status: 'done', priority: 'medium' },
  { id: 't5', title: 'Write blog post for product launch', assignee: 'content_writers', status: 'in-progress', priority: 'high' },
]

const toolSet: Record<string, Array<{ name: string; detail: string }>> = {
  marketing: [
    { name: 'campaign.search', detail: 'Searching campaign database' },
    { name: 'content.draft', detail: 'Drafting marketing copy' },
  ],
  finance: [
    { name: 'ledger.query', detail: 'Querying financial records' },
    { name: 'report.build', detail: 'Compiling budget report' },
  ],
  ops: [
    { name: 'infra.status', detail: 'Checking infrastructure status' },
    { name: 'deploy.plan', detail: 'Planning deployment steps' },
  ],
  analyst: [
    { name: 'data.query', detail: 'Querying analytics store' },
    { name: 'model.fit', detail: 'Fitting forecast model' },
  ],
  default: [
    { name: 'context.read', detail: 'Reading agent context' },
    { name: 'task.plan', detail: 'Planning next steps' },
  ],
}

function toolsForAgent(
  emp: OrgEmployee
): Array<{ name: string; detail: string }> {
  const role = emp.role.toLowerCase()
  if (role.includes('market') || role.includes('content')) return toolSet.marketing
  if (role.includes('financ')) return toolSet.finance
  if (role.includes('ops') || role.includes('admin')) return toolSet.ops
  if (role.includes('analyst')) return toolSet.analyst
  return toolSet.default
}

function buildAgentReply(emp: OrgEmployee, text: string): string {
  const q = text.toLowerCase()
  const pct = Math.round((emp.tokens_used / emp.budget) * 100)
  if (q.includes('status') || q.includes('how are you')) {
    return `All systems nominal on my end — status is ${emp.status} and my last heartbeat came through clean. ${emp.role} duties are running on schedule.`
  }
  if (q.includes('budget') || q.includes('token')) {
    return `Current usage is ${(emp.tokens_used / 1000).toFixed(1)}K of my ${(emp.budget / 1000).toFixed(0)}K monthly token budget (${pct}%). I'm within limits — I'll flag it if I cross 80%.`
  }
  if (q.includes('task') || q.includes('todo') || q.includes('work')) {
    return `I've reviewed my queue and pulled the latest assignments from the board. Say the word and I'll prioritize anything urgent or pick up a new task.`
  }
  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hey! ${emp.name} here — ${emp.title.toLowerCase()}. What do you need? I can check my tasks, report on token usage, or dive into whatever you ask about.`
  }
  if (q.includes('thank')) {
    return `Anytime. I'll keep an eye on things and ping you if anything needs attention.`
  }
  const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text
  return `Got it — I've looked into "${preview}" and it's on my radar. I'll follow up in this thread once I have something concrete for you.`
}

export const useStore = create<AppState>((set) => ({
  employees: initialEmployees,
  connections: initialConnections,
  tasks: initialTasks,
  selectedEmployee: null,
  draggedEmployee: null,
  activeView: 'org',
  realtimeMode: 'connecting',
  heartbeats: {},
  notifications: initialNotifications,
  chatThreads: {},
  chatOpen: false,
  chatAgent: null,

  setSelectedEmployee: (id) => set({ selectedEmployee: id }),
  setDraggedEmployee: (id) => set({ draggedEmployee: id }),
  setActiveView: (view) => set({ activeView: view }),
  setRealtimeMode: (mode) => set({ realtimeMode: mode }),

  openChat: (agentId = null) =>
    set((state) => ({
      chatOpen: true,
      chatAgent:
        agentId && state.employees[agentId] ? agentId : state.chatAgent ?? null,
    })),

  closeChat: () => set({ chatOpen: false }),

  setChatAgent: (agentId) =>
    set((state) => ({
      chatAgent: agentId && state.employees[agentId] ? agentId : null,
    })),

  clearChatThread: (agentId) =>
    set((state) => {
      if (!state.chatThreads[agentId]) return state
      const chatThreads = { ...state.chatThreads }
      delete chatThreads[agentId]
      return { chatThreads }
    }),

  sendAgentMessage: (agentId, text) => {
    const trimmed = text.trim()
    const emp = useStore.getState().employees[agentId]
    if (!trimmed || !emp) return

    const base = Date.now()
    const userMsg: ChatMessage = {
      id: `m-${agentId}-${base}-u`,
      role: 'user',
      text: trimmed,
      timestamp: base,
    }
    const agentMsgId = `m-${agentId}-${base}-a`
    const toolCalls: ChatToolCall[] = toolsForAgent(emp).map((t, i) => ({
      id: `tc-${agentId}-${base}-${i}`,
      ...t,
      status: 'running',
    }))
    const pendingMsg: ChatMessage = {
      id: agentMsgId,
      role: 'agent',
      text: '',
      timestamp: base,
      pending: true,
      toolCalls,
    }

    set((state) => ({
      chatThreads: {
        ...state.chatThreads,
        [agentId]: [...(state.chatThreads[agentId] ?? []), userMsg, pendingMsg],
      },
    }))

    // Simulated agent pipeline: tools resolve one by one, then the reply lands.
    const updateTool = (index: number, status: ChatToolCall['status']) => {
      set((state) => {
        const thread = state.chatThreads[agentId]
        if (!thread) return state
        return {
          chatThreads: {
            ...state.chatThreads,
            [agentId]: thread.map((m) =>
              m.id === agentMsgId
                ? {
                    ...m,
                    toolCalls: m.toolCalls?.map((tc, i) =>
                      i === index ? { ...tc, status } : tc
                    ),
                  }
                : m
            ),
          },
        }
      })
    }

    setTimeout(() => updateTool(0, 'success'), 500 + Math.random() * 400)
    setTimeout(() => updateTool(1, 'success'), 1000 + Math.random() * 400)
    setTimeout(() => {
      set((state) => {
        const thread = state.chatThreads[agentId]
        if (!thread) return state
        return {
          chatThreads: {
            ...state.chatThreads,
            [agentId]: thread.map((m) =>
              m.id === agentMsgId
                ? {
                    ...m,
                    pending: false,
                    text: buildAgentReply(emp, trimmed),
                    toolCalls: m.toolCalls?.map((tc) => ({ ...tc, status: 'success' })),
                  }
                : m
            ),
          },
        }
      })
    }, 1700 + Math.random() * 600)
  },

  updateEmployeeStatus: (id, status) =>
    set((state) => {
      const emp = state.employees[id]
      if (!emp || emp.status === status) return state
      return { employees: { ...state.employees, [id]: { ...emp, status } } }
    }),

  updateEmployeeTokens: (id, tokensUsed) =>
    set((state) => {
      const emp = state.employees[id]
      if (!emp || emp.tokens_used === tokensUsed) return state
      return {
        employees: { ...state.employees, [id]: { ...emp, tokens_used: tokensUsed } },
      }
    }),

  updateTaskStatus: (id, status) =>
    set((state) => {
      const task = state.tasks.find((t) => t.id === id)
      if (!task || task.status === status) return state
      return {
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
      }
    }),

  updateTaskAssignee: (id, assignee) =>
    set((state) => {
      const task = state.tasks.find((t) => t.id === id)
      if (!task || task.assignee === assignee || !state.employees[assignee]) {
        return state
      }
      return {
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, assignee } : t)),
      }
    }),

  updateEmployeeBudget: (id, budget) =>
    set((state) => {
      const emp = state.employees[id]
      if (!emp || emp.budget === budget || budget < 0) return state
      return { employees: { ...state.employees, [id]: { ...emp, budget } } }
    }),

  recordHeartbeat: (id, timestamp) =>
    set((state) => {
      if ((state.heartbeats[id] ?? 0) >= timestamp) return state
      return { heartbeats: { ...state.heartbeats, [id]: timestamp } }
    }),

  pushNotification: (notification) =>
    set((state) => ({
      notifications: prependNotification(state.notifications, notification),
    })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.read ? n : { ...n, read: true }
      ),
    })),

  clearNotifications: () => set({ notifications: [] }),

  applyRealtimeEvent: (event) =>
    set((state) => {
      let notifications = state.notifications

      switch (event.type) {
        case 'agent_status': {
          const emp = state.employees[event.agentId]
          if (!emp || emp.status === event.status) return state
          notifications = prependNotification(notifications, {
            id: `n-status-${event.agentId}-${event.timestamp}`,
            type: 'status',
            employeeId: event.agentId,
            title: `${emp.name} is now ${event.status}`,
            message: `${emp.role} changed status to ${event.status}.`,
            read: false,
            timestamp: event.timestamp,
          })
          return {
            ...state,
            employees: {
              ...state.employees,
              [event.agentId]: { ...emp, status: event.status },
            },
            notifications,
          }
        }
        case 'token_usage': {
          const emp = state.employees[event.agentId]
          if (!emp || emp.tokens_used === event.tokensUsed) return state
          const crossedWarning =
            emp.tokens_used <= emp.budget * 0.8 &&
            event.tokensUsed > emp.budget * 0.8
          if (crossedWarning) {
            const pct = Math.round((event.tokensUsed / emp.budget) * 100)
            notifications = prependNotification(notifications, {
              id: `n-budget-${event.agentId}-${event.timestamp}`,
              type: 'budget',
              employeeId: event.agentId,
              title: `${emp.name} crossed 80% of budget`,
              message: `Token usage is at ${pct}% of the ${emp.budget.toLocaleString()} budget.`,
              read: false,
              timestamp: event.timestamp,
            })
          }
          return {
            ...state,
            employees: {
              ...state.employees,
              [event.agentId]: { ...emp, tokens_used: event.tokensUsed },
            },
            notifications,
          }
        }
        case 'task_update': {
          const task = state.tasks.find((t) => t.id === event.taskId)
          if (!task || task.status === event.status) return state
          if (event.status === 'done') {
            const emp = state.employees[task.assignee]
            notifications = prependNotification(notifications, {
              id: `n-task-${event.taskId}-${event.timestamp}`,
              type: 'task',
              employeeId: task.assignee,
              title: `Task completed: ${task.title}`,
              message: emp ? `${emp.name} finished the task.` : 'A task was marked done.',
              read: false,
              timestamp: event.timestamp,
            })
          }
          return {
            ...state,
            tasks: state.tasks.map((t) =>
              t.id === event.taskId ? { ...t, status: event.status } : t
            ),
            notifications,
          }
        }
        case 'heartbeat': {
          // Record the heartbeat so OrgNode pulses & AgentDetail activity
          // timeline can react to it (regression: was dropped in the
          // notifications refactor).
          const last = state.heartbeats[event.agentId] ?? 0
          if (last >= event.timestamp) return state
          return {
            heartbeats: {
              ...state.heartbeats,
              [event.agentId]: event.timestamp,
            },
          }
        }
      }
    }),

  reassignEmployee: (employeeId, newManagerId) =>
    set((state) => {
      const employees = { ...state.employees }
      const emp = employees[employeeId]
      if (!emp) return state

      // Remove from old manager's children
      if (emp.reports_to && employees[emp.reports_to]) {
        const oldManager = { ...employees[emp.reports_to] }
        oldManager.children = oldManager.children.filter((c) => c !== employeeId)
        employees[emp.reports_to] = oldManager
      }

      // Add to new manager's children
      if (employees[newManagerId]) {
        const newManager = { ...employees[newManagerId] }
        if (!newManager.children.includes(employeeId)) {
          newManager.children = [...newManager.children, employeeId]
        }
        employees[newManagerId] = newManager
      }

      // Update employee
      employees[employeeId] = { ...emp, reports_to: newManagerId }

      // Update connections
      const connections = state.connections
        .filter((c) => c.from !== employeeId && c.to !== employeeId)
        .concat({
          id: `c_${employeeId}_${newManagerId}`,
          from: newManagerId,
          to: employeeId,
          label: 'Manages',
          type: 'delegation',
        })

      return { employees, connections }
    }),

  addEmployee: (employee) =>
    set((state) => {
      const employees = { ...state.employees, [employee.id]: employee }
      if (employee.reports_to && employees[employee.reports_to]) {
        const manager = { ...employees[employee.reports_to] }
        manager.children = [...manager.children, employee.id]
        employees[employee.reports_to] = manager
      }
      return { employees }
    }),

  removeEmployee: (id) =>
    set((state) => {
      const employees = { ...state.employees }
      const emp = employees[id]
      if (!emp) return state

      // Remove from manager's children
      if (emp.reports_to && employees[emp.reports_to]) {
        const manager = { ...employees[emp.reports_to] }
        manager.children = manager.children.filter((c) => c !== id)
        employees[emp.reports_to] = manager
      }

      // Recursively remove children
      const removeRecursive = (empId: string) => {
        const e = employees[empId]
        if (e) {
          e.children.forEach(removeRecursive)
          delete employees[empId]
        }
      }
      removeRecursive(id)

      const connections = state.connections.filter(
        (c) => c.from !== id && c.to !== id
      )

      return { employees, connections }
    }),
}))

// Dev-only: expose the store on window so CDP verification scripts can drive
// state deterministically. Stripped from production builds (import.meta.env.DEV
// is statically replaced and the block is tree-shaken).
if (import.meta.env.DEV) {
  ;(window as unknown as { __useStore: typeof useStore }).__useStore = useStore
}
