import type { Agent } from '../../types/agent'

// Resolve a timeline lane key (e.g. 'main' or a subagent_type) to an Agent
// card on the org chart. Returns null for the main thread, unknown lanes,
// or anything that doesn't match a card.
//
// Matching strategy (cheap on purpose):
//   1. laneKey === 'main' -> null
//   2. Exact match on agents[].name
//   3. Case-insensitive contains either direction (Explore <-> explore-agent)
export function resolveLaneAgent(
  laneKey: string,
  agents: Agent[]
): Agent | null {
  if (laneKey === 'main') return null

  const exact = agents.find((a) => a.name === laneKey)
  if (exact) return exact

  const lk = laneKey.toLowerCase()
  const fuzzy = agents.find((a) => {
    const n = a.name.toLowerCase()
    return n.includes(lk) || lk.includes(n)
  })
  return fuzzy || null
}

export function laneLabel(laneKey: string, agent: Agent | null): string {
  if (laneKey === 'main') return 'Main thread'
  if (agent) return agent.title || agent.name
  return laneKey
}
