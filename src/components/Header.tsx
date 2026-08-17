import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Bell, Settings, Zap, Wifi, WifiOff, Radio, Menu } from 'lucide-react'
import { useStore } from '../store/useStore'
import { paperclip } from '../api/paperclip'
import type { RealtimeMode } from '../types'

const realtimeConfig: Record<
  RealtimeMode,
  { label: string; color: string; pulse: boolean }
> = {
  live: { label: 'Live', color: 'text-emerald-400', pulse: true },
  simulated: { label: 'Demo Feed', color: 'text-amber-400', pulse: true },
  connecting: { label: 'Connecting', color: 'text-slate-400', pulse: true },
  offline: { label: 'Offline', color: 'text-red-400', pulse: false },
}

export function Header({
  onMenuClick,
  onSearchClick,
}: {
  onMenuClick?: () => void
  onSearchClick?: () => void
} = {}) {
  const { employees, realtimeMode } = useStore()
  const activeCount = Object.values(employees).filter(
    (e) => e.status === 'active'
  ).length
  const [connected, setConnected] = useState<boolean | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)

  useEffect(() => {
    paperclip.connect().then(setConnected)
  }, [])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="glass-strong flex items-center justify-between px-4 md:px-6 py-3 mx-3 md:mx-4 mt-3 md:mt-4"
    >
      {/* Left: Menu (mobile) + Logo */}
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl hover:bg-white/8 transition-colors lg:hidden cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5 text-slate-300" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-white">
            Paperclip
          </h1>
          <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
            AI Agent Command Center
          </p>
        </div>
      </div>

      {/* Center: Search (hidden on mobile, icon button instead) */}
      <div className="flex-1 max-w-md mx-8 hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="global-search"
            type="text"
            placeholder="Search agents, tasks, workflows..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`w-full pl-10 pr-16 py-2 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all ${
              searchFocused
                ? 'bg-white/8 border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                : 'bg-white/5 border border-white/8'
            }`}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/8 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>
      <button
        onClick={onSearchClick}
        className="p-2 rounded-xl hover:bg-white/8 transition-colors sm:hidden cursor-pointer"
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-slate-300" />
      </button>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Connection indicator */}
        <div
          className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
            connected === true
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : connected === false
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-white/5 border-white/8'
          }`}
        >
          {connected === true ? (
            <Wifi className="w-3 h-3 text-emerald-400" />
          ) : connected === false ? (
            <WifiOff className="w-3 h-3 text-red-400" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
          )}
          <span
            className={`text-xs font-medium ${
              connected === true
                ? 'text-emerald-400'
                : connected === false
                  ? 'text-red-400'
                  : 'text-slate-400'
            }`}
          >
            {connected === true
              ? 'Connected'
              : connected === false
                ? 'Offline'
                : 'Connecting...'}
          </span>
        </div>

        {/* Real-time feed indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Radio className="w-3 h-3 text-amber-400" />
          <span className={`text-xs font-medium ${realtimeConfig[realtimeMode].color}`}>
            {realtimeConfig[realtimeMode].label}
          </span>
          {realtimeConfig[realtimeMode].pulse && (
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>

        {/* Active agents (compact dot on mobile) */}
        <div className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs text-indigo-300 font-medium">
            {activeCount}
            <span className="hidden md:inline"> active</span>
          </span>
        </div>

        <button className="relative p-2 rounded-xl hover:bg-white/8 transition-colors">
          <Bell className="w-4.5 h-4.5 text-slate-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>

        <button className="p-2 rounded-xl hover:bg-white/8 transition-colors">
          <Settings className="w-4.5 h-4.5 text-slate-400" />
        </button>

        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white cursor-pointer">
          U
        </div>
      </div>
    </motion.header>
  )
}
