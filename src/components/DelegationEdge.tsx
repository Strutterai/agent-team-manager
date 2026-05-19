import { useState, useCallback } from 'react'
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { useAgentStore } from '../store/agentStore'

export function DelegationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const updateDelegation = useAgentStore((s) => s.updateDelegation)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState((data?.reason as string) || '')

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const commit = useCallback(() => {
    updateDelegation(id, { reason: draft })
    setEditing(false)
  }, [id, draft, updateDelegation])

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#52b788', strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') setEditing(false)
              }}
              placeholder="Reason for delegation..."
              className="rounded border border-brand bg-surface-2 px-2 py-1 text-xs text-text-1 shadow-lg outline-none w-56"
            />
          ) : (
            <button
              onDoubleClick={() => {
                setDraft((data?.reason as string) || '')
                setEditing(true)
              }}
              className={`
                rounded border px-2 py-0.5 text-xs shadow-md transition-colors
                ${data?.reason
                  ? 'border-brand/40 bg-surface-2 text-text-2 hover:border-brand'
                  : 'border-dashed border-border-2 bg-surface-2/80 text-text-3 hover:border-brand hover:text-brand'
                }
              `}
              title="Double-click to edit delegation reason"
            >
              {(data?.reason as string) || 'double-click to label'}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
