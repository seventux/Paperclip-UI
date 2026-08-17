import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useStore } from '../store/useStore'

function WorkflowNodeCard({ data }: { data: { label: string; icon: string; color: string; subtitle: string } }) {
  return (
    <div
      className="backdrop-blur-xl rounded-2xl border border-white/10 p-4 min-w-[180px] hover:border-white/20 transition-all"
      style={{ background: 'rgba(15, 15, 30, 0.8)' }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${data.color}20` }}
        >
          {data.icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{data.label}</p>
          <p className="text-[10px] text-slate-400">{data.subtitle}</p>
        </div>
      </div>
      <div
        className="h-[2px] rounded-full opacity-50"
        style={{ background: `linear-gradient(90deg, transparent, ${data.color}, transparent)` }}
      />
    </div>
  )
}

const nodeTypes = { workflowNode: WorkflowNodeCard }

export function WorkflowPanel() {
  const { employees, connections } = useStore()

  const initialNodes: Node[] = useMemo(() => {
    return Object.values(employees).map((emp, idx) => {
      const isTopLevel = !emp.reports_to
      return {
        id: emp.id,
        type: 'workflowNode',
        position: {
          x: isTopLevel ? 400 : (idx % 3) * 280 + 50,
          y: isTopLevel ? 50 : 250 + Math.floor(idx / 3) * 150,
        },
        data: {
          label: emp.name,
          icon: emp.avatar,
          color: emp.color,
          subtitle: emp.title,
        },
      }
    })
  }, [employees])

  const initialEdges: Edge[] = useMemo(() => {
    return connections.map((conn) => ({
      id: conn.id,
      source: conn.from,
      target: conn.to,
      label: conn.label,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6366f1',
        width: 16,
        height: 16,
      },
      labelStyle: {
        fill: '#94a3b8',
        fontSize: 10,
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: 'rgba(15, 15, 30, 0.9)',
        fillOpacity: 0.9,
      },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 8,
    }))
  }, [connections])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(() => {
    // Handle new connections
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex-1 overflow-hidden"
    >
      {/* Title bar */}
      <div className="px-6 pt-4">
        <h2 className="text-xl font-bold text-white">Workflow Connector</h2>
        <p className="text-sm text-slate-400 mt-1">
          Visual agent pipeline — like n8n, but for AI agents
        </p>
      </div>

      {/* Flow canvas */}
      <div className="h-[calc(100%-80px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(99, 102, 241, 0.08)" gap={24} size={1} />
          <Controls
            className="!bg-[rgba(15,15,30,0.8)] !backdrop-blur-xl !border-white/8 !rounded-xl !shadow-xl"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(n) => {
              const emp = employees[n.id]
              return emp?.color || '#6366f1'
            }}
            maskColor="rgba(10, 10, 26, 0.7)"
            className="!bg-[rgba(15,15,30,0.8)] !backdrop-blur-xl !border-white/8 !rounded-xl"
          />
        </ReactFlow>
      </div>
    </motion.div>
  )
}
