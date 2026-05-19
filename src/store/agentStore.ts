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
    debouncedSyncDelegations(get)
  },

  selectAgent: (id) => set({ selectedAgentId: id }),

  addDelegation: (from, to) => {
    const id = crypto.randomUUID()
    set((s) => ({
      delegations: [...s.delegations, { id, from, to, reason: '' }],
    }))
    get().saveChart()
    debouncedSyncDelegations(get)
  },

  updateDelegation: (id, patch) => {
    set((s) => ({
      delegations: s.delegations.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }))
    debouncedSave(get)
    debouncedSyncDelegations(get)
  },

  removeDelegation: (id) => {
    set((s) => ({ delegations: s.delegations.filter((d) => d.id !== id) }))
    get().saveChart()
    debouncedSyncDelegations(get)
  },

  setOutputDir: (dir) => {
    set({ outputDirectory: dir })
    debouncedReload(get, dir)
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

let syncTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSyncDelegations(get: () => AgentStore) {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    const { outputDirectory, agents, delegations } = get()
    if (!outputDirectory || agents.length === 0) return
    try {
      await fetch('/api/sync-delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputDirectory, agents, delegations }),
      })
    } catch (err) {
      console.error('Sync delegations failed:', err)
    }
  }, 800)
}

let reloadTimer: ReturnType<typeof setTimeout> | null = null

function debouncedReload(get: () => AgentStore, directory: string) {
  if (reloadTimer) clearTimeout(reloadTimer)
  reloadTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputDirectory: directory }),
      })
      if (!res.ok) return
      const data = (await res.json()) as OrgChart
      get().loadChart(data)
      get().saveChart()
    } catch (err) {
      console.error('Reload failed:', err)
    }
  }, 600)
}

function debouncedSave(get: () => AgentStore) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => get().saveChart(), 500)
}
