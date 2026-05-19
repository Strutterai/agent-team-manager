import { useAgentStore } from '../store/agentStore'

export function AgentPanel() {
  const selectedId = useAgentStore((s) => s.selectedAgentId)
  const agents = useAgentStore((s) => s.agents)
  const updateAgent = useAgentStore((s) => s.updateAgent)
  const removeAgent = useAgentStore((s) => s.removeAgent)
  const selectAgent = useAgentStore((s) => s.selectAgent)

  const agent = agents.find((a) => a.id === selectedId)

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-gray-400">
        Select an agent to configure it
      </div>
    )
  }

  const field = (
    label: string,
    key: keyof typeof agent,
    multiline = false,
    placeholder = ''
  ) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={(agent[key] as string) || ''}
          onChange={(e) => updateAgent(agent.id, { [key]: e.target.value })}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none"
        />
      ) : (
        <input
          type="text"
          value={(agent[key] as string) || ''}
          onChange={(e) => updateAgent(agent.id, { [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
        />
      )}
    </div>
  )

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="text-sm font-semibold text-gray-700">Agent Config</span>
        <button
          onClick={() => selectAgent(null)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          title="Close panel"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {field('Name', 'name', false, 'e.g. frontend-agent')}
        {field('Title', 'title', false, 'e.g. Frontend Engineer Agent')}
        {field('Role', 'role', false, 'One-line summary of what this agent does')}
        {field('Responsibilities', 'responsibilities', true, 'What this agent is responsible for...')}
        {field('Goals', 'goals', true, 'What this agent is trying to achieve...')}
      </div>

      <div className="mt-auto border-t border-gray-100 px-4 py-3">
        <button
          onClick={() => removeAgent(agent.id)}
          className="w-full rounded-md border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
        >
          Remove Agent
        </button>
      </div>
    </div>
  )
}
