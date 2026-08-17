import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { User, Coins, Clock, ChevronRight, X } from 'lucide-react'

export function EmployeePool() {
  const { employees, selectedEmployee, setSelectedEmployee } = useStore()
  const agentList = Object.values(employees)
  const selected = selectedEmployee ? employees[selectedEmployee] : null

  return (
    <motion.aside
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="w-[280px] flex flex-col gap-4 p-4 shrink-0 overflow-hidden"
    >
      {/* Detail Panel (if selected) */}
      {selected && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-strong p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Agent Detail
            </p>
            <button
              onClick={() => setSelectedEmployee(null)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${selected.color}20` }}
            >
              {selected.avatar}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{selected.name}</h3>
              <p className="text-xs text-slate-400">{selected.title}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-xl bg-white/3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <User className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-500">Status</span>
              </div>
              <span className={`text-xs font-semibold ${
                selected.status === 'active' ? 'text-emerald-400' :
                selected.status === 'idle' ? 'text-amber-400' : 'text-slate-500'
              }`}>
                {selected.status}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Coins className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-500">Reports</span>
              </div>
              <span className="text-xs font-semibold text-white">
                {selected.children.length}
              </span>
            </div>
          </div>

          {/* Budget Detail */}
          <div className="mt-3 p-2 rounded-xl bg-white/3 border border-white/5">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] text-slate-500">Token Budget</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(selected.tokens_used / selected.budget) * 100}%`,
                }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${selected.color}, ${selected.color}88)`,
                }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-slate-400">
                {(selected.tokens_used / 1000).toFixed(1)}K used
              </span>
              <span className="text-[10px] text-slate-500">
                {(selected.budget / 1000).toFixed(0)}K total
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Employee List */}
      <div className="glass-strong p-3 flex-1 overflow-auto">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 px-1 py-1 font-semibold mb-2">
          All Agents ({agentList.length})
        </p>
        <div className="flex flex-col gap-1">
          {agentList.map((emp) => (
            <motion.button
              key={emp.id}
              whileHover={{ x: 2 }}
              onClick={() => setSelectedEmployee(emp.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                selectedEmployee === emp.id
                  ? 'bg-indigo-500/15 border border-indigo-500/20'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ background: `${emp.color}20` }}
              >
                {emp.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {emp.name}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{emp.role}</p>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    emp.status === 'active'
                      ? 'bg-emerald-400'
                      : emp.status === 'idle'
                        ? 'bg-amber-400'
                        : 'bg-slate-500'
                  }`}
                />
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.aside>
  )
}
