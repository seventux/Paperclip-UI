import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Users, CheckSquare, Workflow, ArrowRight } from 'lucide-react'
import { useStore } from '../store/useStore'

type FilterType = 'all' | 'agents' | 'tasks' | 'workflows'

interface SearchResult {
  id: string
  type: 'agent' | 'task' | 'workflow'
  title: string
  subtitle: string
  icon: string
  color: string
}

export function SearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { employees, tasks, setActiveView } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allResults: SearchResult[] = [
    ...Object.values(employees).map((e) => ({
      id: e.id,
      type: 'agent' as const,
      title: e.name,
      subtitle: `${e.title} — ${e.status}`,
      icon: e.avatar,
      color: e.color,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      subtitle: `${t.status} • ${t.priority}`,
      icon: '📋',
      color: '#6366f1',
    })),
  ]

  const filtered = allResults.filter((r) => {
    const matchesQuery =
      query === '' ||
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(query.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'agents' && r.type === 'agent') ||
      (filter === 'tasks' && r.type === 'task') ||
      (filter === 'workflows' && r.type === 'workflow')
    return matchesQuery && matchesFilter
  })

  useEffect(() => {
    setSelectedIdx(0)
  }, [query, filter])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setQuery('')
      setFilter('all')
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered[selectedIdx]) {
        const result = filtered[selectedIdx]
        if (result.type === 'agent') {
          setActiveView('org')
        } else if (result.type === 'task') {
          setActiveView('tasks')
        }
        onClose()
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [filtered, selectedIdx, onClose, setActiveView]
  )

  const filters: { id: FilterType; icon: typeof Users; label: string }[] = [
    { id: 'all', icon: Search, label: 'All' },
    { id: 'agents', icon: Users, label: 'Agents' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'workflows', icon: Workflow, label: 'Workflows' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[min(560px,calc(100vw-2rem))] max-h-[min(480px,80vh)] overflow-hidden rounded-2xl backdrop-blur-2xl bg-[rgba(15,15,30,0.95)] border border-white/10 shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search agents, tasks, workflows..."
                className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
              <kbd className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/8 font-mono">
                esc
              </kbd>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1 px-5 py-2 border-b border-white/5">
              {filters.map((f) => {
                const Icon = f.icon
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filter === f.id
                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {f.label}
                  </button>
                )
              })}
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">No results found</p>
                </div>
              ) : (
                filtered.map((result, i) => (
                  <motion.button
                    key={result.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => {
                      if (result.type === 'agent') setActiveView('org')
                      else if (result.type === 'task') setActiveView('tasks')
                      onClose()
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      i === selectedIdx
                        ? 'bg-indigo-500/10 border border-indigo-500/20'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ background: `${result.color}20` }}
                    >
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {result.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-slate-500 uppercase">
                        {result.type}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
