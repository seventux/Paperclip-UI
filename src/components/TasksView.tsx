import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { OrgEmployee, Task } from '../types'

const statusConfig = {
  todo: { icon: Circle, label: 'To Do', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' },
  'in-progress': { icon: Clock, label: 'In Progress', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  review: { icon: AlertCircle, label: 'Review', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  done: { icon: CheckCircle2, label: 'Done', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
}

const columnIds: Task['status'][] = ['todo', 'in-progress', 'review', 'done']

const priorityColors = {
  low: 'text-slate-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
}

// Shared card content so the drag overlay can render the same visual
function TaskCardContent({
  task,
  assignee,
}: {
  task: Task
  assignee?: OrgEmployee
}) {
  return (
    <div className="glass p-4">
      <p className="text-sm font-medium text-white mb-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {assignee && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                style={{ background: `${assignee.color}20` }}
              >
                {assignee.avatar}
              </div>
              <span className="text-[10px] text-slate-400">{assignee.name}</span>
            </div>
          )}
        </div>
        <span className={`text-[10px] font-medium ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>
    </div>
  )
}

function TaskCard({ task, assignee }: { task: Task; assignee?: OrgEmployee }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { task },
    })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <TaskCardContent task={task} assignee={assignee} />
    </motion.div>
  )
}

function TaskColumn({
  status,
  tasks,
  employees,
}: {
  status: Task['status']
  tasks: Task[]
  employees: Record<string, OrgEmployee>
}) {
  const config = statusConfig[status]
  const Icon = config.icon
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${status}`,
    data: { status },
  })

  return (
    <div className="flex flex-col gap-3 min-w-[240px] md:min-w-0">
      {/* Column header */}
      <div className="glass-strong px-4 py-3 flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: config.color }} />
        <span className="text-sm font-semibold text-white">{config.label}</span>
        <span className="ml-auto text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
          {tasks.length}
        </span>
      </div>

      {/* Task cards — droppable column body */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 flex-1 overflow-auto rounded-xl transition-all duration-200 ${
          isOver ? 'drag-over-indicator bg-white/5' : ''
        }`}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} assignee={employees[task.assignee]} />
        ))}
        {tasks.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-8">
            {isOver ? 'Release to move here' : 'Drop tasks here'}
          </div>
        )}
      </div>
    </div>
  )
}

// Agent chips above the board: drop a task on an agent to reassign it
function AgentDropZone({ agent }: { agent: OrgEmployee }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `agent:${agent.id}`,
    data: { agentId: agent.id },
  })

  return (
    <div
      ref={setNodeRef}
      className={`shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition-all duration-200 ${
        isOver
          ? 'border-indigo-400/60 bg-indigo-500/15 ring-1 ring-indigo-400/40'
          : 'border-white/8 bg-white/5'
      }`}
      title={`Drop a task to assign to ${agent.name}`}
    >
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center text-[11px]"
        style={{ background: `${agent.color}20` }}
      >
        {agent.avatar}
      </div>
      <span className="text-[11px] text-slate-300">{agent.name}</span>
    </div>
  )
}

export function TasksView() {
  const { tasks, employees, updateTaskStatus, updateTaskAssignee } = useStore()
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setDraggedTaskId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: {
      active: { id: string | number }
      over: { id: string | number } | null
    }) => {
      const taskId = String(event.active.id)
      setDraggedTaskId(null)
      if (!event.over) return

      const overId = String(event.over.id)
      if (overId.startsWith('column:')) {
        const status = overId.slice('column:'.length) as Task['status']
        updateTaskStatus(taskId, status)
      } else if (overId.startsWith('agent:')) {
        const assignee = overId.slice('agent:'.length)
        updateTaskAssignee(taskId, assignee)
      }
    },
    [updateTaskStatus, updateTaskAssignee]
  )

  const handleDragCancel = useCallback(() => {
    setDraggedTaskId(null)
  }, [])

  const grouped = {
    todo: tasks.filter((t) => t.status === 'todo'),
    'in-progress': tasks.filter((t) => t.status === 'in-progress'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  const draggedTask = draggedTaskId
    ? tasks.find((t) => t.id === draggedTaskId)
    : null
  const agents = Object.values(employees)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex-1 overflow-auto p-4 md:p-6"
    >
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">Task Board</h2>
        <p className="text-sm text-slate-400 mt-1">
          Drag tasks between columns to change status, or drop them on an agent to reassign
        </p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Agent dock: drop target for reassigning tasks */}
        <div className="glass px-3 py-2 mb-4 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-slate-500 shrink-0">Drop to assign →</span>
          {agents.map((agent) => (
            <AgentDropZone key={agent.id} agent={agent} />
          ))}
        </div>

        {/* Swipeable columns on mobile, fixed 4-column grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0 h-[calc(100%-80px)]">
          {columnIds.map((status) => (
            <TaskColumn
              key={status}
              status={status}
              tasks={grouped[status]}
              employees={employees}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {draggedTask ? (
            <div className="rotate-2 scale-105 opacity-90">
              <TaskCardContent
                task={draggedTask}
                assignee={employees[draggedTask.assignee]}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </motion.div>
  )
}
