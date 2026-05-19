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
        min-w-[160px] rounded-lg border-2 bg-white px-4 py-3 shadow-sm
        transition-colors
        ${selected ? 'border-blue-500 shadow-blue-100 shadow-md' : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="text-sm font-semibold text-gray-900 leading-tight">
        {data.title || data.name || 'Unnamed Agent'}
      </div>
      {data.name && data.title && (
        <div className="mt-0.5 text-xs text-gray-400 font-mono">{data.name}</div>
      )}
      {data.role && (
        <div className="mt-1.5 text-xs text-gray-500 leading-snug line-clamp-2">{data.role}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  )
}
