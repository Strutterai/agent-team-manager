import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'
import { TurkeyLogo } from './TurkeyLogo'
import { SetupPromptModal } from './SetupPromptModal'

export function Toolbar() {
  const addAgent = useAgentStore((s) => s.addAgent)
  const outputDirectory = useAgentStore((s) => s.outputDirectory)
  const setOutputDir = useAgentStore((s) => s.setOutputDir)
  const agents = useAgentStore((s) => s.agents)
  const delegations = useAgentStore((s) => s.delegations)

  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showSetupPrompt, setShowSetupPrompt] = useState(false)

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message })
    setTimeout(() => setStatus(null), 4000)
  }

  const handleExport = async () => {
    setStatus(null)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputDirectory, agents, delegations }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      showStatus('success', `Saved ${data.files.length} agent file${data.files.length === 1 ? '' : 's'}`)
    } catch (err) {
      showStatus('error', String(err))
    }
  }

  return (
    <div className="flex items-center gap-4 border-b border-border-1 bg-surface-0 px-5 py-3">
      <div className="flex items-center gap-2.5">
        <TurkeyLogo className="h-7 w-7 text-brand" />
        <div className="flex flex-col leading-none">
          <span className="font-display text-xl tracking-wider text-text-1">
            AGENT TEAM MANAGER
          </span>
          <span className="text-[10px] text-text-3 uppercase tracking-widest mt-0.5">
            by Strutter AI
          </span>
        </div>
      </div>

      <div className="h-6 w-px bg-border-1 mx-1" />

      <button
        onClick={addAgent}
        className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-surface-0 hover:bg-brand-light transition-colors"
      >
        + Add Agent
      </button>

      <button
        onClick={() => setShowSetupPrompt(true)}
        className="rounded-md border border-brand bg-transparent px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-surface-0 transition-colors"
        title="Get a prompt to paste into Claude Code to bootstrap your agent team"
      >
        ⚡ Bootstrap with Claude
      </button>

      <div className="flex items-center gap-2 ml-auto">
        <label className="text-xs text-text-3 whitespace-nowrap uppercase tracking-wider">
          Agents directory
        </label>
        <input
          type="text"
          value={outputDirectory}
          onChange={(e) => setOutputDir(e.target.value)}
          placeholder="~/.claude"
          className="w-80 rounded-md border border-border-1 bg-surface-2 px-3 py-1.5 text-xs text-text-1 placeholder:text-text-3 outline-none focus:border-brand transition-colors font-mono"
        />
        <button
          onClick={handleExport}
          disabled={agents.length === 0}
          className="rounded-md border border-brand bg-transparent px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-surface-0 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Save All
        </button>
      </div>

      {status && (
        <div
          className={`ml-3 rounded-md px-3 py-1.5 text-xs font-medium ${
            status.type === 'success'
              ? 'bg-brand/15 text-brand border border-brand/30'
              : 'bg-red-500/15 text-red-400 border border-red-500/30'
          }`}
        >
          {status.message}
        </div>
      )}

      {showSetupPrompt && <SetupPromptModal onClose={() => setShowSetupPrompt(false)} />}
    </div>
  )
}
