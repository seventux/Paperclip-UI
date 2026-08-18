import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ChatMessage } from '../types'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.max(1, Math.round(diff / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function AgentChat() {
  const {
    employees,
    chatOpen,
    chatAgent,
    chatThreads,
    closeChat,
    setChatAgent,
    sendAgentMessage,
    clearChatThread,
  } = useStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const agents = Object.values(employees)
  const activeEmp = chatAgent ? employees[chatAgent] : null
  const thread = chatAgent ? chatThreads[chatAgent] ?? [] : []

  // Auto-scroll to the newest message whenever the thread changes
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread.length, chatAgent, chatOpen])

  // Escape closes the drawer
  useEffect(() => {
    if (!chatOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chatOpen, closeChat])

  const handleSend = () => {
    const text = input.trim()
    if (!text || !chatAgent) return
    sendAgentMessage(chatAgent, text)
    setInput('')
  }

  const lastMessage = (agentId: string): ChatMessage | undefined =>
    (chatThreads[agentId] ?? []).slice(-1)[0]

  return (
    <AnimatePresence>
      {chatOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeChat}
            className="fixed inset-0 z-[290] bg-black/50 backdrop-blur-sm"
          />
          {/* Drawer */}
          <motion.aside
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 z-[300] w-[min(400px,calc(100vw-1.5rem))] flex flex-col backdrop-blur-2xl bg-(--modal-bg) border-l border-white/10 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-[#fff]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-white leading-tight">Agent Chat</h2>
                <p className="text-[10px] text-slate-500">
                  {chatAgent ? `Conversation with ${activeEmp?.name ?? 'agent'}` : `${agents.length} agents available`}
                </p>
              </div>
              <button
                onClick={closeChat}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close chat"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {chatAgent === null ? (
              /* ---- Thread list ---- */
              <div className="flex-1 overflow-auto p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 px-1 py-1 font-semibold mb-2">
                  Conversations
                </p>
                <div className="flex flex-col gap-1.5">
                  {agents.map((emp) => {
                    const last = lastMessage(emp.id)
                    return (
                      <motion.button
                        key={emp.id}
                        whileHover={{ x: 2 }}
                        onClick={() => setChatAgent(emp.id)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 border border-transparent hover:border-white/8 transition-all cursor-pointer"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ background: `${emp.color}20` }}
                        >
                          {emp.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-white truncate">{emp.name}</p>
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                emp.status === 'active'
                                  ? 'bg-emerald-400'
                                  : emp.status === 'idle'
                                    ? 'bg-amber-400'
                                    : 'bg-slate-500'
                              }`}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            {last
                              ? `${last.role === 'user' ? 'You: ' : ''}${last.pending ? 'typing…' : last.text}`
                              : `Start a conversation with ${emp.name}`}
                          </p>
                        </div>
                        {last && (
                          <span className="text-[9px] text-slate-600 shrink-0">
                            {timeAgo(last.timestamp)}
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* ---- Conversation view ---- */
              <>
                {/* Thread header */}
                {activeEmp && (
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
                    <button
                      onClick={() => setChatAgent(null)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-400" />
                    </button>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: `${activeEmp.color}20` }}
                    >
                      {activeEmp.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{activeEmp.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {activeEmp.title} · {activeEmp.status}
                      </p>
                    </div>
                    {thread.length > 0 && (
                      <button
                        onClick={() => clearChatThread(activeEmp.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        title="Clear conversation"
                        aria-label="Clear conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-auto p-4" data-chat-thread>
                  {thread.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3"
                        style={{ background: `${activeEmp?.color ?? '#6366f1'}20` }}
                      >
                        {activeEmp?.avatar ?? '🤖'}
                      </div>
                      <p className="text-sm font-medium text-white">
                        Chat with {activeEmp?.name ?? 'agent'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ask about their tasks, token usage, or anything else. The agent replies with a
                        tool-call trace.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {thread.map((msg) => (
                        <div key={msg.id}>
                          {msg.role === 'user' ? (
                            <div className="flex justify-end">
                              <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-gradient-to-br from-indigo-600 to-purple-600 text-[#fff] text-sm shadow-lg shadow-indigo-500/20">
                                {msg.text}
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-start">
                              <div className="max-w-[85%]">
                                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/5 border border-white/8 text-slate-200 text-sm">
                                  {msg.pending ? (
                                    <div className="flex items-center gap-1.5 py-0.5">
                                      {[0, 1, 2].map((i) => (
                                        <span
                                          key={i}
                                          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                                          style={{ animationDelay: `${i * 130}ms` }}
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    msg.text
                                  )}
                                </div>
                                {/* Tool call trace */}
                                {msg.toolCalls && msg.toolCalls.length > 0 && (
                                  <div className="mt-1.5 flex flex-col gap-1" data-chat-tools>
                                    {msg.toolCalls.map((tc) => (
                                      <div
                                        key={tc.id}
                                        data-chat-tool
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/3 border border-white/5"
                                      >
                                        <Wrench className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="font-mono text-[10px] text-indigo-300 truncate">
                                          {tc.name}
                                        </span>
                                        {tc.detail && (
                                          <span className="text-[10px] text-slate-500 truncate">
                                            {tc.detail}
                                          </span>
                                        )}
                                        <span className="ml-auto shrink-0">
                                          {tc.status === 'running' ? (
                                            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                                          ) : tc.status === 'success' ? (
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                          ) : (
                                            <X className="w-3 h-3 text-rose-400" />
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-white/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <input
                      data-chat-input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder={`Message ${activeEmp?.name ?? 'agent'}…`}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                    <button
                      data-chat-send
                      onClick={handleSend}
                      disabled={!input.trim() || !chatAgent}
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-500/20"
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4 text-[#fff]" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
