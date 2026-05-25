import { useEffect, useMemo } from 'react'
import { useAgentStore } from '../store/agentStore'
import { TimelineCanvas } from './timeline/TimelineCanvas'

export function TimelineView() {
  const sessions = useAgentStore((s) => s.sessions)
  const activeSessionId = useAgentStore((s) => s.activeSessionId)
  const loadSessions = useAgentStore((s) => s.loadSessions)
  const loadSession = useAgentStore((s) => s.loadSession)
  const loading = useAgentStore((s) => s.timelineLoading)
  const error = useAgentStore((s) => s.timelineError)
  const events = useAgentStore((s) => s.timelineEvents)
  const inspectedEventId = useAgentStore((s) => s.inspectedEventId)

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Auto-select the most recent session once on first list.
  useEffect(() => {
    if (sessions.length && !activeSessionId) {
      loadSession(sessions[0].sessionId)
    }
  }, [sessions, activeSessionId, loadSession])

  const inspected = useMemo(
    () => events.find((e) => e.id === inspectedEventId) || null,
    [events, inspectedEventId]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border-1 bg-surface-0 px-5 py-2">
        <label className="text-xs text-text-3 uppercase tracking-wider">Session</label>
        <select
          value={activeSessionId || ''}
          onChange={(e) => loadSession(e.target.value)}
          className="min-w-80 rounded-md border border-border-1 bg-surface-2 px-3 py-1.5 text-xs text-text-1 outline-none focus:border-brand"
        >
          {sessions.length === 0 && <option value="">No sessions found</option>}
          {sessions.map((s) => (
            <option key={s.sessionId} value={s.sessionId}>
              {s.title} — {new Date(s.endedAt).toLocaleString()}
            </option>
          ))}
        </select>
        {loading && <span className="text-xs text-text-3">Loading…</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
        <Legend />
      </div>

      <div className="flex-1 overflow-hidden">
        <TimelineCanvas />
      </div>

      {inspected && (
        <div className="h-64 shrink-0 overflow-auto border-t border-border-1 bg-surface-0 px-5 py-3">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-wider text-text-3">{inspected.kind}</span>
            <span className="text-sm font-semibold text-text-1">{inspected.label}</span>
            <span className="ml-auto text-xs text-text-3 font-mono">
              {new Date(inspected.ts).toLocaleTimeString()}
            </span>
          </div>
          <pre className="text-xs text-text-2 font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(inspected, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function Legend() {
  const items: Array<{ label: string; color: string; shape: 'circle' | 'diamond' | 'hex' | 'square' }> = [
    { label: 'tool', color: '#5b8def', shape: 'circle' },
    { label: 'skill', color: '#c084fc', shape: 'hex' },
    { label: 'delegation', color: '#52b788', shape: 'diamond' },
    { label: 'hook', color: '#f59e0b', shape: 'square' },
  ]
  return (
    <div className="ml-auto flex items-center gap-3 text-[11px] text-text-3">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5"
            style={{
              background: it.color,
              transform: it.shape === 'diamond' || it.shape === 'square' ? 'rotate(45deg)' : undefined,
              borderRadius: it.shape === 'circle' ? '50%' : it.shape === 'hex' ? '20%' : 0,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  )
}
