import { create } from 'zustand'
import type { Agent, Delegation, OrgChart } from '../types/agent'

interface AgentStore extends OrgChart {
  selectedAgentId: string | null

  // Hydration
  loadChart: (chart: OrgChart) => void

  // Agents
  addAgent: () => void
  updateAgent: (id: string, patch: Partial<Agent>) => void
  removeAgent: (id: string) => void
  selectAgent: (id: string | null) => void

  // Delegations
  addDelegation: (from: string, to: string) => void
  updateDelegation: (id: string, patch: Partial<Delegation>) => void
  removeDelegation: (id: string) => void

  // Settings
  setOutputDir: (dir: string) => void

  // Persistence
  saveChart: () => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useAgentStore = create<AgentStore>((set, get) => ({
  outputDirectory: '',
  agents: [],
  delegations: [],
  selectedAgentId: null,

  loadChart: (chart) => set({ ...chart }),

  addAgent: () => {
    const id = crypto.randomUUID()
    const agent: Agent = {
      id,
      name: 'new-agent',
      title: 'New Agent',
      role: '',
      responsibilities: '',
      goals: '',
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
    }
    set((s) => ({ agents: [...s.agents, agent], selectedAgentId: id }))
    get().saveChart()
  },

  updateAgent: (id, patch) => {
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }))
    debouncedSave(get)
  },

  removeAgent: (id) => {
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== id),
      delegations: s.delegations.filter((d) => d.from !== id && d.to !== id),
      selectedAgentId: s.selectedAgentId === id ? null : s.selectedAgentId,
    }))
    get().saveChart()
  },

  selectAgent: (id) => set({ selectedAgentId: id }),

  addDelegation: (from, to) => {
    const id = crypto.randomUUID()
    set((s) => ({
      delegations: [...s.delegations, { id, from, to, reason: '' }],
    }))
    get().saveChart()
  },

  updateDelegation: (id, patch) => {
    set((s) => ({
      delegations: s.delegations.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }))
    debouncedSave(get)
  },

  removeDelegation: (id) => {
    set((s) => ({ delegations: s.delegations.filter((d) => d.id !== id) }))
    get().saveChart()
  },

  setOutputDir: (dir) => {
    set({ outputDirectory: dir })
    debouncedSave(get)
  },

  saveChart: async () => {
    const { outputDirectory, agents, delegations } = get()
    await fetch('/api/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputDirectory, agents, delegations }),
    })
  },
}))

function debouncedSave(get: () => AgentStore) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => get().saveChart(), 500)
}
