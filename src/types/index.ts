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
