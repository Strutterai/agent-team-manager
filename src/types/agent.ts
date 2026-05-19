export interface Agent {
  id: string
  name: string
  title: string
  role: string
  responsibilities: string
  goals: string
  position: { x: number; y: number }
}

export interface Delegation {
  id: string
  from: string
  to: string
  reason: string
}

export interface OrgChart {
  outputDirectory: string
  agents: Agent[]
  delegations: Delegation[]
}
