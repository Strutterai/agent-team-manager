import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'

export type AgentNodeType = Node<
  {
    name: string
    title: string
    role: string
    responsibilities: string
    goals: string
  },
  'agent'
>

export function AgentNode({ data, selected }: NodeProps<AgentNodeType>) {
  return (
    <div
      className={`
        relative min-w-[200px] max-w-[260px] rounded-lg border bg-surface-2 px-4 py-3 shadow-lg
        transition-all duration-150
        ${selected
          ? 'border-brand shadow-[0_0_0_3px_rgba(82,183,136,0.2)]'
          : 'border-border-1 hover:border-border-2'}
      `}
    >
      <Handle type="target" position={Position.Top} />

      <div className="font-display text-lg leading-none tracking-wide text-text-1">
        {data.title || data.name || 'UNNAMED AGENT'}
      </div>
      {data.name && (
        <div className="mt-1 font-mono text-[10px] text-brand uppercase tracking-wider">
          {data.name}
        </div>
      )}
      {data.role && (
        <div className="mt-2 text-xs text-text-2 leading-snug line-clamp-3">
          {data.role}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
