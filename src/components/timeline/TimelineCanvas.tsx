import { useMemo } from 'react'
import { useAgentStore } from '../../store/agentStore'
import type { TimelineEvent } from '../../types/agent'
import { resolveLaneAgent, laneLabel } from './laneResolve'
import { TimelineEventMarker } from './TimelineEventMarker'

const LANE_HEIGHT = 56
const LABEL_WIDTH = 160
const HEADER_HEIGHT = 28
const PADDING_X = 24
const MIN_MS_PER_PX = 50 // 50ms = 1px floor; prevents zero-width on short sessions

export function TimelineCanvas() {
  const events = useAgentStore((s) => s.timelineEvents)
  const laneKeys = useAgentStore((s) => s.timelineLaneKeys)
  const agents = useAgentStore((s) => s.agents)
  const selectAgent = useAgentStore((s) => s.selectAgent)
  const inspectedEventId = useAgentStore((s) => s.inspectedEventId)
  const setInspectedEvent = useAgentStore((s) => s.setInspectedEvent)

  const lanes = useMemo(() => {
    const keys = ['main', ...laneKeys.filter((k) => k !== 'main')]
    return keys.map((laneKey) => {
      const agent = resolveLaneAgent(laneKey, agents)
      return { laneKey, agent, label: laneLabel(laneKey, agent) }
    })
  }, [laneKeys, agents])

  const laneIndex = useMemo(() => {
    const m = new Map<string, number>()
    lanes.forEach((l, i) => m.set(l.laneKey, i))
    return m
  }, [lanes])

  const { startedAt, durationMs } = useMemo(() => {
    if (events.length === 0) return { startedAt: 0, durationMs: 0 }
    const first = events[0].ts
    const last = events[events.length - 1].ts
    return { startedAt: first, durationMs: Math.max(last - first, 1) }
  }, [events])

  // Aim for ~1600px of horizontal canvas regardless of session length,
  // floored at 50ms/px so dense sessions stay scrollable.
  const msPerPx = Math.max(durationMs / 1600, MIN_MS_PER_PX / 1000)
  const innerWidth = Math.max(durationMs / msPerPx, 800)
  const totalWidth = LABEL_WIDTH + PADDING_X * 2 + innerWidth
  const totalHeight = HEADER_HEIGHT + lanes.length * LANE_HEIGHT

  const xFor = (ts: number) => LABEL_WIDTH + PADDING_X + (ts - startedAt) / msPerPx
  const yFor = (laneKey: string) => {
    const idx = laneIndex.get(laneKey) ?? 0
    return HEADER_HEIGHT + idx * LANE_HEIGHT + LANE_HEIGHT / 2
  }

  const onMarkerClick = (ev: TimelineEvent) => {
    setInspectedEvent(ev.id)
    const lane = lanes.find((l) => l.laneKey === ev.laneKey)
    if (lane?.agent) selectAgent(lane.agent.id)
  }

  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-text-3 text-sm">
        Pick a session above to load its timeline.
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-surface-1">
      <svg width={totalWidth} height={totalHeight} className="block">
        {/* Lane backgrounds + labels */}
        {lanes.map((lane, i) => {
          const y = HEADER_HEIGHT + i * LANE_HEIGHT
          return (
            <g key={lane.laneKey}>
              <rect
                x={0}
                y={y}
                width={totalWidth}
                height={LANE_HEIGHT}
                fill={i % 2 === 0 ? 'var(--color-surface-1)' : 'var(--color-surface-2)'}
              />
              <line
                x1={LABEL_WIDTH}
                y1={y}
                x2={totalWidth}
                y2={y}
                stroke="var(--color-border-1)"
                strokeWidth={1}
              />
              <foreignObject x={8} y={y + 6} width={LABEL_WIDTH - 16} height={LANE_HEIGHT - 12}>
                <button
                  onClick={() => lane.agent && selectAgent(lane.agent.id)}
                  disabled={!lane.agent}
                  className={`w-full text-left ${
                    lane.agent
                      ? 'text-text-1 hover:text-brand cursor-pointer'
                      : 'text-text-3 cursor-default'
                  }`}
                >
                  <div className="text-xs font-semibold truncate">{lane.label}</div>
                  {lane.laneKey !== 'main' && !lane.agent && (
                    <div className="text-[10px] text-text-3">(not in org chart)</div>
                  )}
                </button>
              </foreignObject>
            </g>
          )
        })}

        {/* Vertical separator between labels and timeline */}
        <line
          x1={LABEL_WIDTH}
          y1={0}
          x2={LABEL_WIDTH}
          y2={totalHeight}
          stroke="var(--color-border-2)"
          strokeWidth={1}
        />

        {/* Delegation arrows */}
        {events.map((ev) => {
          if (ev.kind !== 'delegation') return null
          const x = xFor(ev.ts)
          const y1 = yFor(ev.laneKey)
          const y2 = yFor(ev.toLaneKey)
          if (!laneIndex.has(ev.toLaneKey)) return null
          const midX = x + 30
          return (
            <path
              key={`arrow-${ev.id}`}
              d={`M ${x} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x} ${y2}`}
              stroke="var(--color-brand)"
              strokeWidth={1.5}
              fill="none"
              opacity={0.5}
              markerEnd="url(#arrowhead)"
            />
          )
        })}

        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-brand)" />
          </marker>
        </defs>

        {/* Event markers */}
        {events.map((ev) => (
          <TimelineEventMarker
            key={ev.id}
            event={ev}
            x={xFor(ev.ts)}
            y={yFor(ev.laneKey)}
            selected={ev.id === inspectedEventId}
            onClick={() => onMarkerClick(ev)}
          />
        ))}
      </svg>
    </div>
  )
}
