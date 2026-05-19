import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'

export function Toolbar() {
  const addAgent = useAgentStore((s) => s.addAgent)
  const outputDirectory = useAgentStore((s) => s.outputDirectory)
  const setOutputDir = useAgentStore((s) => s.setOutputDir)
  const agents = useAgentStore((s) => s.agents)
  const delegations = useAgentStore((s) => s.delegations)

  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleExport = async () => {
    setStatus(null)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputDirectory, agents, delegations }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Export failed')
      setStatus({ type: 'success', message: `Exported ${data.files.length} agent file(s)` })
    } catch (err) {
      setStatus({ type: 'error', message: String(err) })
    }
    setTimeout(() => setStatus(null), 4000)
  }

  return (
    <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
      <span className="text-sm font-bold text-gray-800 mr-2">Agent Team Manager</span>

      <button
        onClick={addAgent}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
      >
        + Add Agent
      </button>

      <div className="flex items-center gap-2 ml-auto">
        <label className="text-xs text-gray-500 whitespace-nowrap">Output directory</label>
        <input
          type="text"
          value={outputDirectory}
          onChange={(e) => setOutputDir(e.target.value)}
          placeholder="~/.claude"
          className="w-64 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-blue-400"
        />
        <button
          onClick={handleExport}
          disabled={agents.length === 0}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Export CLAUDE.md files
        </button>
      </div>

      {status && (
        <div
          className={`ml-3 rounded-md px-3 py-1.5 text-xs font-medium ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  )
}
