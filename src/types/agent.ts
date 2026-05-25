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

export interface SessionMeta {
  sessionId: string
  title: string
  startedAt: number
  endedAt: number
  sizeBytes: number
}

export type TimelineEventKind =
  | 'agent-start'
  | 'agent-end'
  | 'tool'
  | 'skill'
  | 'delegation'
  | 'hook'
  | 'message'

interface TimelineEventBase {
  id: string
  ts: number
  laneKey: string
  kind: TimelineEventKind
  label: string
}

export interface ToolEvent extends TimelineEventBase {
  kind: 'tool'
  toolName: string
  input: unknown
  result?: unknown
}

export interface SkillEvent extends TimelineEventBase {
  kind: 'skill'
  skill: string
  input: unknown
}

export interface DelegationEvent extends TimelineEventBase {
  kind: 'delegation'
  toLaneKey: string
  subagentType: string
  prompt: string
  toolUseId: string
}

export interface HookEvent extends TimelineEventBase {
  kind: 'hook'
  operation: string
  durationMs?: number
}

export interface AgentLifecycleEvent extends TimelineEventBase {
  kind: 'agent-start' | 'agent-end'
  subagentType: string
}

export interface MessageEvent extends TimelineEventBase {
  kind: 'message'
  role: 'user' | 'assistant'
  preview: string
}

export type TimelineEvent =
  | ToolEvent
  | SkillEvent
  | DelegationEvent
  | HookEvent
  | AgentLifecycleEvent
  | MessageEvent

export interface SessionReplay {
  sessionId: string
  startedAt: number
  endedAt: number
  laneKeys: string[]
  events: TimelineEvent[]
}
