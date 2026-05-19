import { useEffect } from 'react'
import { useAgentStore } from './store/agentStore'
import { OrgChart } from './components/OrgChart'
import { AgentPanel } from './components/AgentPanel'
import { Toolbar } from './components/Toolbar'
import type { OrgChart as OrgChartType } from './types/agent'

export default function App() {
  const loadChart = useAgentStore((s) => s.loadChart)
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId)

  useEffect(() => {
    fetch('/api/chart')
      .then((r) => r.json())
      .then((data: OrgChartType) => loadChart(data))
      .catch(console.error)
  }, [loadChart])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-1">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <OrgChart />
        </div>
        {selectedAgentId && (
          <div className="w-96 shrink-0 overflow-y-auto border-l border-border-1 bg-surface-2 shadow-2xl">
            <AgentPanel />
          </div>
        )}
      </div>
    </div>
  )
}
