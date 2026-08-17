import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { OrgChart } from './components/OrgChart'
import { TasksView } from './components/TasksView'
import { EmployeePool } from './components/EmployeePool'
import { Hero } from './components/Hero'
import { ConnectorConfig } from './components/ConnectorConfig'
import { FloatingBar } from './components/FloatingBar'
import { OnboardingModal } from './components/OnboardingModal'
import { CostChart } from './components/CostChart'
import { SearchModal } from './components/SearchModal'
import { useStore } from './store/useStore'
import { paperclip } from './api/paperclip'

function App() {
  const { activeView, setActiveView } = useStore()
  const [showHero, setShowHero] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

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
      // Escape → Close modals
      if (e.key === 'Escape') {
        setShowSearch(false)
        setShowOnboarding(false)
      }
      // 1/2/3 → Switch views (when not in input)
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
    [showSearch, showOnboarding, setActiveView]
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

  if (showHero) {
    return (
      <div className="h-full flex flex-col relative z-10">
        <Header />
        <Hero onGetStarted={handleGetStarted} />
        <FloatingBar
          onAddAgent={() => setShowOnboarding(true)}
          onShowOrg={handleShowOrg}
          onShowWorkflow={handleShowWorkflow}
        />
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
        />
        <SearchModal
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative z-10">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <AnimatePresence mode="wait">
          {activeView === 'org' && (
            <div className="flex-1 flex overflow-hidden">
              <OrgChart />
              <div className="w-[280px] shrink-0 flex flex-col gap-4 p-4 overflow-auto">
                <EmployeePool />
                <CostChart />
              </div>
            </div>
          )}
          {activeView === 'workflow' && <ConnectorConfig />}
          {activeView === 'tasks' && <TasksView />}
        </AnimatePresence>
      </div>

      <FloatingBar
        onAddAgent={() => setShowOnboarding(true)}
        onShowOrg={handleShowOrg}
        onShowWorkflow={handleShowWorkflow}
      />

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />
    </div>
  )
}

export default App
