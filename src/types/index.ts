export interface OrgEmployee {
  id: string
  name: string
  role: string
  title: string
  avatar: string
  color: string
  status: 'active' | 'idle' | 'offline'
  tokens_used: number
  budget: number
  reports_to: string | null
  children: string[]
}

export interface Connection {
  id: string
  from: string
  to: string
  label: string
  type: 'delegation' | 'reporting' | 'workflow'
}

export interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'output'
  label: string
  icon: string
  x: number
  y: number
  config?: Record<string, unknown>
}

export interface Task {
  id: string
  title: string
  assignee: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
}

export type EmployeeStatus = OrgEmployee['status']

export interface AgentStatusEvent {
  type: 'agent_status'
  agentId: string
  status: EmployeeStatus
  timestamp: number
}

export interface TokenUsageEvent {
  type: 'token_usage'
  agentId: string
  tokensUsed: number
  timestamp: number
}

export interface HeartbeatEvent {
  type: 'heartbeat'
  agentId: string
  timestamp: number
}

export interface TaskUpdateEvent {
  type: 'task_update'
  taskId: string
  status: Task['status']
  timestamp: number
}

export type RealtimeEvent =
  | AgentStatusEvent
  | TokenUsageEvent
  | HeartbeatEvent
  | TaskUpdateEvent

export type RealtimeMode = 'connecting' | 'live' | 'simulated' | 'offline'

export type ActiveView = 'org' | 'workflow' | 'tasks' | 'agent'

export type NotificationType = 'status' | 'budget' | 'task' | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  /** Related agent id, when the notification is about an employee */
  employeeId?: string
  read: boolean
  timestamp: number
}

export type ChatRole = 'user' | 'agent'

export type ChatToolStatus = 'running' | 'success' | 'error'

export interface ChatToolCall {
  id: string
  name: string
  status: ChatToolStatus
  /** Human-readable description of what the tool is doing */
  detail?: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  timestamp: number
  /** Tool call trace attached to an agent reply */
  toolCalls?: ChatToolCall[]
  /** True while the agent is still "working" on the reply */
  pending?: boolean
}
