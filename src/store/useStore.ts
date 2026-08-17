import { create } from 'zustand'
import type { OrgEmployee, Connection, Task } from '../types'

interface AppState {
  employees: Record<string, OrgEmployee>
  connections: Connection[]
  tasks: Task[]
  selectedEmployee: string | null
  draggedEmployee: string | null
  activeView: 'org' | 'workflow' | 'tasks'
  setSelectedEmployee: (id: string | null) => void
  setDraggedEmployee: (id: string | null) => void
  setActiveView: (view: 'org' | 'workflow' | 'tasks') => void
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

const initialTasks: Task[] = [
  { id: 't1', title: 'Launch Q3 marketing campaign', assignee: 'cmo', status: 'in-progress', priority: 'high' },
  { id: 't2', title: 'Prepare monthly budget report', assignee: 'cfo', status: 'review', priority: 'medium' },
  { id: 't3', title: 'Onboard new agent: Pixel', assignee: 'admin', status: 'todo', priority: 'low' },
  { id: 't4', title: 'SEO audit and optimization', assignee: 'marketing_lead', status: 'done', priority: 'medium' },
  { id: 't5', title: 'Write blog post for product launch', assignee: 'content_writers', status: 'in-progress', priority: 'high' },
]

export const useStore = create<AppState>((set) => ({
  employees: initialEmployees,
  connections: initialConnections,
  tasks: initialTasks,
  selectedEmployee: null,
  draggedEmployee: null,
  activeView: 'org',

  setSelectedEmployee: (id) => set({ selectedEmployee: id }),
  setDraggedEmployee: (id) => set({ draggedEmployee: id }),
  setActiveView: (view) => set({ activeView: view }),

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
