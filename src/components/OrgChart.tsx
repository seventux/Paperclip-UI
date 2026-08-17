import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core'
import { useStore } from '../store/useStore'
import { OrgNode } from './OrgNode'

export function OrgChart() {
  const {
    employees,
    reassignEmployee,
    draggedEmployee,
    setDraggedEmployee,
  } = useStore()
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = useCallback(
    (event: { active: { id: string | number } }) => {
      setDraggedEmployee(String(event.active.id))
    },
    [setDraggedEmployee]
  )

  const handleDragOver = useCallback(
    (event: { over: { id: string | number } | null }) => {
      if (event.over && String(event.over.id) !== draggedEmployee) {
        setDropTarget(String(event.over.id))
      } else {
        setDropTarget(null)
      }
    },
    [draggedEmployee]
  )

  const handleDragEnd = useCallback(
    (event: {
      active: { id: string | number }
      over: { id: string | number } | null
    }) => {
      if (event.over && draggedEmployee) {
        const targetId = String(event.over.id)
        if (targetId !== draggedEmployee) {
          reassignEmployee(draggedEmployee, targetId)
        }
      }
      setDraggedEmployee(null)
      setDropTarget(null)
    },
    [draggedEmployee, reassignEmployee, setDraggedEmployee]
  )

  const draggedEmp = draggedEmployee ? employees[draggedEmployee] : null

  // Build tree structure
  const renderTree = (empId: string, depth: number = 0) => {
    const emp = employees[empId]
    if (!emp) return null
    const children = emp.children
      .map((childId) => employees[childId])
      .filter(Boolean)

    return (
      <div key={empId} className="flex flex-col items-center">
        <OrgNode
          employee={emp}
          isDropTarget={dropTarget === empId}
          compact={depth > 1}
        />
        {children.length > 0 && (
          <>
            {/* Vertical connector line */}
            <div className="w-[1px] h-6 bg-gradient-to-b from-indigo-500/40 to-indigo-500/10" />
            {/* Children row */}
            <div className="flex items-start gap-4">
              {children.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  {renderTree(child.id, depth + 1)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex-1 overflow-auto p-6"
      >
        {/* Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Organization Chart</h2>
          <p className="text-sm text-slate-400 mt-1">
            Drag agents to reassign them to a different manager
          </p>
        </div>

        {/* Tree */}
        <div className="flex justify-center pt-4">{renderTree('ceo')}</div>
      </motion.div>

      <DragOverlay>
        {draggedEmp ? (
          <div className="opacity-90 scale-105 rotate-2">
            <OrgNode employee={draggedEmp} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
