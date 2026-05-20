import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'

export function AgentPanel() {
  const selectedId = useAgentStore((s) => s.selectedAgentId)
  const agents = useAgentStore((s) => s.agents)
  const delegations = useAgentStore((s) => s.delegations)
  const outputDirectory = useAgentStore((s) => s.outputDirectory)
  const updateAgent = useAgentStore((s) => s.updateAgent)
  const removeAgent = useAgentStore((s) => s.removeAgent)
  const selectAgent = useAgentStore((s) => s.selectAgent)
  const addDelegation = useAgentStore((s) => s.addDelegation)
  const updateDelegation = useAgentStore((s) => s.updateDelegation)
  const removeDelegation = useAgentStore((s) => s.removeDelegation)

  const agent = agents.find((a) => a.id === selectedId)

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [savedName, setSavedName] = useState(agent?.name ?? '')

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-text-3">
        Select an agent to configure it
      </div>
    )
  }

  const outgoing = delegations.filter((d) => d.from === agent.id)
  const incoming = delegations.filter((d) => d.to === agent.id)
  const nameOf = (id: string) => {
    const a = agents.find((x) => x.id === id)
    return a?.title || a?.name || id
  }
  const otherAgents = agents.filter((a) => a.id !== agent.id)

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('idle')
    const oldName = savedName !== agent.name ? savedName : undefined
    try {
      const res = await fetch('/api/save-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputDirectory, agent, agents, delegations, oldName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSavedName(agent.name)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (err) {
      setErrMsg(String(err))
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 4000)
    } finally {
      setSaving(false)
    }
  }

  const field = (
    label: string,
    key: keyof typeof agent,
    multiline = false,
    placeholder = ''
  ) => (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold text-text-3 uppercase tracking-widest">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={(agent[key] as string) || ''}
          onChange={(e) => updateAgent(agent.id, { [key]: e.target.value })}
          placeholder={placeholder}
          rows={5}
          className="w-full rounded-md border border-border-1 bg-surface-1 px-3 py-2 text-sm text-text-1 placeholder:text-text-3 outline-none focus:border-brand transition-colors resize-none font-mono"
        />
      ) : (
        <input
          type="text"
          value={(agent[key] as string) || ''}
          onChange={(e) => updateAgent(agent.id, { [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full rounded-md border border-border-1 bg-surface-1 px-3 py-2 text-sm text-text-1 placeholder:text-text-3 outline-none focus:border-brand transition-colors"
        />
      )}
    </div>
  )

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface-2">
      <div className="flex items-center justify-between border-b border-border-1 px-4 py-3 sticky top-0 bg-surface-2 z-10">
        <span className="font-display text-lg tracking-wide text-text-1">AGENT CONFIG</span>
        <button
          onClick={() => selectAgent(null)}
          className="text-text-3 hover:text-text-1 text-xl leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-surface-3 transition-colors"
          title="Close panel"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {field('Name', 'name', false, 'frontend-agent')}
        {field('Title', 'title', false, 'Frontend Engineer Agent')}
        {field('Role', 'role', false, 'One-line summary of what this agent does')}
        {field('Responsibilities', 'responsibilities', true, 'What this agent is responsible for...')}
        {field('Goals', 'goals', true, 'What this agent is trying to achieve...')}

        {/* Reports to (read-only, derived from incoming delegations) */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold text-text-3 uppercase tracking-widest">
            Reports to
          </label>
          {incoming.length === 0 ? (
            <div className="text-xs text-text-3 italic px-3 py-2 border border-dashed border-border-1 rounded-md">
              No incoming delegations
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {incoming.map((d) => (
                <div
                  key={d.id}
                  className="text-xs text-text-2 bg-surface-1 border border-border-1 rounded-md px-3 py-2"
                >
                  <span className="text-brand font-medium">{nameOf(d.from)}</span>
                  {d.reason && <span className="text-text-3"> for {d.reason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delegates to (editable) */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold text-text-3 uppercase tracking-widest">
            Delegates to
          </label>
          <div className="flex flex-col gap-2">
            {outgoing.map((d) => (
              <div key={d.id} className="flex flex-col gap-1.5 bg-surface-1 border border-border-1 rounded-md p-2">
                <div className="flex items-center gap-2">
                  <select
                    value={d.to}
                    onChange={(e) => {
                      removeDelegation(d.id)
                      addDelegation(agent.id, e.target.value)
                    }}
                    className="flex-1 rounded border border-border-1 bg-surface-2 px-2 py-1 text-xs text-text-1 outline-none focus:border-brand"
                  >
                    {otherAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title || a.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeDelegation(d.id)}
                    className="text-text-3 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded text-base"
                    title="Remove delegation"
                  >
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  value={d.reason}
                  onChange={(e) => updateDelegation(d.id, { reason: e.target.value })}
                  placeholder="Reason for delegation"
                  className="rounded border border-border-1 bg-surface-2 px-2 py-1 text-xs text-text-1 placeholder:text-text-3 outline-none focus:border-brand"
                />
              </div>
            ))}
            <button
              onClick={() => {
                const first = otherAgents[0]
                if (first) addDelegation(agent.id, first.id)
              }}
              disabled={otherAgents.length === 0}
              className="rounded-md border border-dashed border-border-2 px-3 py-2 text-xs text-text-3 hover:border-brand hover:text-brand transition-colors disabled:opacity-40"
            >
              + Add delegation
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-border-1 px-4 py-3 bg-surface-2 sticky bottom-0 flex flex-col gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`
            w-full rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors
            ${saveStatus === 'success'
              ? 'bg-brand text-surface-0'
              : saveStatus === 'error'
              ? 'bg-red-500/20 border border-red-500/40 text-red-400'
              : 'bg-brand text-surface-0 hover:bg-brand-light disabled:opacity-40'
            }
          `}
        >
          {saving
            ? 'Saving...'
            : saveStatus === 'success'
            ? '✓ Saved to agent file'
            : saveStatus === 'error'
            ? errMsg.slice(0, 40)
            : `Save ${agent.name}.md`}
        </button>
        <button
          onClick={() => removeAgent(agent.id)}
          className="w-full rounded-md border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors uppercase tracking-wider"
        >
          Remove Agent
        </button>
      </div>
    </div>
  )
}
