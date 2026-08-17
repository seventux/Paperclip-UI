import { useState, useEffect } from 'react'
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
import { useStore } from './store/useStore'
import { paperclip } from './api/paperclip'

function App() {
  const { activeView, setActiveView } = useStore()
  const [showHero, setShowHero] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    paperclip.connect().then((connected) => {
      if (connected) {
        console.log('🔗 Paperclip UI connected to server')
      }
    })
  }, [])

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
    </div>
  )
}

export default App
