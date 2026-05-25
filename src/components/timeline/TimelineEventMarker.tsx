import type { TimelineEvent } from '../../types/agent'

interface Props {
  event: TimelineEvent
  x: number
  y: number
  selected: boolean
  onClick: () => void
}

// Shape per event kind. Colors come from Tailwind tokens via stroke/fill
// CSS variables already in use across the app.
export function TimelineEventMarker({ event, x, y, selected, onClick }: Props) {
  const fill = colorFor(event.kind)
  const stroke = selected ? 'var(--color-brand)' : 'var(--color-border-2)'
  const strokeWidth = selected ? 2 : 1

  const common = {
    onClick,
    style: { cursor: 'pointer' },
    stroke,
    strokeWidth,
  } as const

  if (event.kind === 'delegation') {
    return (
      <polygon
        {...common}
        points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`}
        fill={fill}
      >
        <title>{event.label}</title>
      </polygon>
    )
  }

  if (event.kind === 'skill') {
    const r = 6
    return (
      <polygon
        {...common}
        points={hexPoints(x, y, r)}
        fill={fill}
      >
        <title>{event.label}</title>
      </polygon>
    )
  }

  if (event.kind === 'hook') {
    return (
      <rect
        {...common}
        x={x - 5}
        y={y - 5}
        width={10}
        height={10}
        transform={`rotate(45 ${x} ${y})`}
        fill={fill}
      >
        <title>{event.label}</title>
      </rect>
    )
  }

  if (event.kind === 'agent-start' || event.kind === 'agent-end') {
    return (
      <rect
        {...common}
        x={x - 2}
        y={y - 10}
        width={4}
        height={20}
        fill={fill}
      >
        <title>{event.label}</title>
      </rect>
    )
  }

  if (event.kind === 'message') {
    return (
      <circle {...common} cx={x} cy={y} r={4} fill={fill}>
        <title>{event.label}</title>
      </circle>
    )
  }

  // tool
  return (
    <circle {...common} cx={x} cy={y} r={5} fill={fill}>
      <title>{event.label}</title>
    </circle>
  )
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
  }
  return pts.join(' ')
}

function colorFor(kind: TimelineEvent['kind']): string {
  switch (kind) {
    case 'tool':
      return '#5b8def'
    case 'skill':
      return '#c084fc'
    case 'delegation':
      return '#52b788'
    case 'hook':
      return '#f59e0b'
    case 'agent-start':
    case 'agent-end':
      return '#52b788'
    case 'message':
      return '#9ca3af'
  }
}
