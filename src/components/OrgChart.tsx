import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react'
import type { Connection, NodeChange, EdgeChange, Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAgentStore } from '../store/agentStore'
import { AgentNode } from './AgentNode'
import type { AgentNodeType } from './AgentNode'
import { DelegationEdge } from './DelegationEdge'

const nodeTypes = { agent: AgentNode }
const edgeTypes = { delegation: DelegationEdge }

export function OrgChart() {
  const agents = useAgentStore((s) => s.agents)
  const delegations = useAgentStore((s) => s.delegations)
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId)
  const addDelegation = useAgentStore((s) => s.addDelegation)
  const removeDelegation = useAgentStore((s) => s.removeDelegation)
  const removeAgent = useAgentStore((s) => s.removeAgent)
  const updateAgent = useAgentStore((s) => s.updateAgent)
  const selectAgent = useAgentStore((s) => s.selectAgent)

  const nodes: AgentNodeType[] = useMemo(
    () =>
      agents.map((a) => ({
        id: a.id,
        type: 'agent' as const,
        position: a.position,
        data: {
          name: a.name,
          title: a.title,
          role: a.role,
          responsibilities: a.responsibilities,
          goals: a.goals,
        },
        selected: a.id === selectedAgentId,
      })),
    [agents, selectedAgentId]
  )

  const edges: Edge[] = useMemo(
    () =>
      delegations.map((d) => ({
        id: d.id,
        source: d.from,
        target: d.to,
        type: 'delegation',
        data: { reason: d.reason },
      })),
    [delegations]
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange<AgentNodeType>[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateAgent(change.id, { position: change.position })
        }
        if (change.type === 'remove') {
          removeAgent(change.id)
        }
      }
    },
    [updateAgent, removeAgent]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          removeDelegation(change.id)
        }
      }
    },
    [removeDelegation]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addDelegation(connection.source, connection.target)
      }
    },
    [addDelegation]
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectAgent(node.id)
    },
    [selectAgent]
  )

  const handlePaneClick = useCallback(() => {
    selectAgent(null)
  }, [selectAgent])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        deleteKeyCode="Delete"
      >
        <Background gap={20} color="#f1f5f9" />
        <Controls />
        <MiniMap
          nodeColor={() => '#dbeafe'}
          maskColor="rgba(255,255,255,0.7)"
          className="!border-gray-200"
        />
      </ReactFlow>
    </div>
  )
}
