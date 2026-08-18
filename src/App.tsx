import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { OrgChart } from './components/OrgChart'
import { TasksView } from './components/TasksView'
import { EmployeePool } from './components/EmployeePool'
import { Hero } from './components/Hero'
import { ConnectorConfig } from './components/ConnectorConfig'
import { AgentDetail } from './components/AgentDetail'
import { FloatingBar } from './components/FloatingBar'
import { OnboardingModal } from './components/OnboardingModal'
import { CostChart } from './components/CostChart'
import { SearchModal } from './components/SearchModal'
import { AgentChat } from './components/AgentChat'
import { CostDashboard } from './components/CostDashboard'
import { useStore } from './store/useStore'
import { paperclip } from './api/paperclip'
import { useRealtime } from './hooks/useRealtime'

function App() {
  const { activeView, setActiveView, openChat } = useStore()
  const [showHero, setShowHero] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Real-time updates: WebSocket when a Paperclip server is reachable,
  // simulated feed otherwise (standalone/demo mode)
  useRealtime()

  useEffect(() => {
    paperclip.connect().then((connected) => {
      if (connected) {
        console.log('🔗 Paperclip UI connected to server')
      }
    })
  }, [])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K → Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      // Escape → Close modals & mobile nav
      if (e.key === 'Escape') {
        setShowSearch(false)
        setShowOnboarding(false)
        setMobileNavOpen(false)
        // Escape from agent detail page back to org chart
        if (activeView === 'agent') setActiveView('org')
      }
      // 1/2/3/4 → Switch views (when not in input)
      if (
        !showSearch &&
        !showOnboarding &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        if (e.key === '1') {
          setShowHero(false)
          setActiveView('org')
        }
        if (e.key === '2') {
          setShowHero(false)
          setActiveView('workflow')
        }
        if (e.key === '3') {
          setShowHero(false)
          setActiveView('tasks')
        }
        if (e.key === '4') {
          setShowHero(false)
          setActiveView('cost')
        }
        // N → New agent
        if (e.key === 'n' || e.key === 'N') {
          setShowHero(false)
          setShowOnboarding(true)
        }
        // H → Home/Hero
        if (e.key === 'h' || e.key === 'H') {
          setShowHero(true)
        }
      }
    },
    [showSearch, showOnboarding, activeView, setActiveView]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleGetStarted = () => {
    setShowHero(false)
  }

  const handleShowOrg = () => {
    setShowHero(false)
    setActiveView('org')
  }

  const handleShowWorkflow = () => {
    setShowHero(false)
    setActiveView('workflow')
  }

  // Mobile nav drawer (off-canvas sidebar, below lg breakpoint)
  const mobileDrawer = (
    <AnimatePresence>
      {mobileNavOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[264px] p-3 flex flex-col lg:hidden"
          >
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <Sidebar
                onNavigate={() => {
                  // Exit hero and close the drawer when navigating from mobile
                  setShowHero(false)
                  setMobileNavOpen(false)
                }}
                onAddAgent={() => {
                  setShowHero(false)
                  setShowOnboarding(true)
                  setMobileNavOpen(false)
                }}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )

  if (showHero) {
    return (
      <div className="h-full flex flex-col relative z-10">
        <Header
          onMenuClick={() => setMobileNavOpen(true)}
          onSearchClick={() => setShowSearch(true)}
        />
        <Hero onGetStarted={handleGetStarted} />
        <FloatingBar
          onAddAgent={() => setShowOnboarding(true)}
          onShowOrg={handleShowOrg}
          onShowWorkflow={handleShowWorkflow}
          onShowCost={() => {
            setShowHero(false)
            setActiveView('cost')
          }}
          onQuickChat={() => openChat()}
        />
        {mobileDrawer}
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
        />
        <SearchModal
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
        />
        <AgentChat />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative z-10">
      <Header
        onMenuClick={() => setMobileNavOpen(true)}
        onSearchClick={() => setShowSearch(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar (hidden on mobile; drawer replaces it) */}
        <div className="hidden lg:block shrink-0">
          <Sidebar />
        </div>
        <AnimatePresence mode="wait">
          {activeView === 'org' && (
            <div className="flex-1 flex overflow-hidden">
              <OrgChart />
              <div className="w-[280px] shrink-0 flex-col gap-4 p-4 overflow-auto hidden lg:flex">
                <EmployeePool />
                <CostChart />
              </div>
            </div>
          )}
          {activeView === 'workflow' && <ConnectorConfig />}
          {activeView === 'tasks' && <TasksView />}
          {activeView === 'agent' && <AgentDetail />}
          {activeView === 'cost' && <CostDashboard />}
        </AnimatePresence>
      </div>

      <FloatingBar
        onAddAgent={() => setShowOnboarding(true)}
        onShowOrg={handleShowOrg}
        onShowWorkflow={handleShowWorkflow}
        onShowCost={() => {
          setShowHero(false)
          setActiveView('cost')
        }}
        onQuickChat={() => openChat()}
      />

      {mobileDrawer}

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />

      <AgentChat />
    </div>
  )
}

export default App
