import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  CheckCheck,
  Trash2,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Zap,
  X,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { NotificationType } from '../types'

const typeMeta: Record<
  NotificationType,
  { icon: typeof Activity; color: string; label: string }
> = {
  status: { icon: Activity, color: '#6366f1', label: 'Status' },
  budget: { icon: AlertTriangle, color: '#f59e0b', label: 'Budget' },
  task: { icon: CheckCircle2, color: '#10b981', label: 'Task' },
  system: { icon: Zap, color: '#a78bfa', label: 'System' },
}

function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead, clearNotifications } =
    useStore()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-white/8 transition-colors cursor-pointer"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-4.5 h-4.5 text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white text-[9px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-[340px] max-w-[calc(100vw-2rem)] glass-strong rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded">
                  {unreadCount} new
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllNotificationsRead}
                      title="Mark all as read"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={clearNotifications}
                      title="Clear all"
                      className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors cursor-pointer lg:hidden"
                  aria-label="Close notifications"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-[55vh] overflow-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center text-slate-500 text-sm">
                  <Bell className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = typeMeta[n.type]
                  const Icon = meta.icon
                  return (
                    <button
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer border-b border-white/3 last:border-b-0 ${
                        n.read ? 'hover:bg-white/4' : 'bg-indigo-500/5 hover:bg-indigo-500/10'
                      }`}
                    >
                      <span
                        className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${meta.color}1a` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-baseline gap-2">
                          <span
                            className={`text-xs font-medium truncate ${
                              n.read ? 'text-slate-400' : 'text-white'
                            }`}
                          >
                            {n.title}
                          </span>
                          <span className="text-[9px] text-slate-600 shrink-0 ml-auto tabular-nums">
                            {timeAgo(n.timestamp)}
                          </span>
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">
                          {n.message}
                        </span>
                      </span>
                      {!n.read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
