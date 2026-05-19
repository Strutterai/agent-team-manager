import { describe, it, expect } from 'vitest'
import type { Agent, Delegation } from '../../src/types/agent.js'
import {
  buildClaudeMd,
  buildDelegationSection,
  parseAgentMd,
  replaceDelegationSection,
} from './agent-md.js'

const stableId = (n: number) => () => `id-${n++}`

const makeAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'agent-1',
  name: 'test-agent',
  title: 'Test Agent',
  role: 'Tests stuff',
  responsibilities: 'Runs tests',
  goals: 'Green CI',
  position: { x: 0, y: 0 },
  ...overrides,
})

describe('buildClaudeMd', () => {
  it('generates the standard 4-section structure', () => {
    const md = buildClaudeMd(makeAgent(), [], [])
    expect(md).toContain('# Test Agent')
    expect(md).toContain('## Role\nTests stuff')
    expect(md).toContain('## Responsibilities\nRuns tests')
    expect(md).toContain('## Goals\nGreen CI')
  })

  it('falls back to name when title is missing', () => {
    const md = buildClaudeMd(makeAgent({ title: '' }), [], [])
    expect(md.split('\n')[0]).toBe('# test-agent')
  })

  it('emits empty section bodies when fields are blank (no skipping)', () => {
    const md = buildClaudeMd(makeAgent({ role: '', responsibilities: '', goals: '' }), [], [])
    expect(md).toContain('## Role\n\n')
    expect(md).toContain('## Responsibilities\n\n')
    expect(md).toContain('## Goals\n')
  })

  it('omits the Delegation section entirely when there are no delegations', () => {
    const md = buildClaudeMd(makeAgent(), [], [])
    expect(md).not.toContain('## Delegation')
  })

  it('includes the Delegation section when delegations exist', () => {
    const a = makeAgent({ id: 'a', name: 'a', title: 'Agent A' })
    const b = makeAgent({ id: 'b', name: 'b', title: 'Agent B' })
    const delegations: Delegation[] = [
      { id: 'd1', from: 'a', to: 'b', reason: 'work handoff' },
    ]
    const md = buildClaudeMd(a, delegations, [a, b])
    expect(md).toContain('## Delegation')
    expect(md).toContain('**Delegates to:**')
    expect(md).toContain('- Agent B for work handoff')
  })

  it('ends with a trailing newline', () => {
    const md = buildClaudeMd(makeAgent(), [], [])
    expect(md.endsWith('\n')).toBe(true)
  })
})

describe('buildDelegationSection', () => {
  const a = makeAgent({ id: 'a', name: 'a', title: 'Agent A' })
  const b = makeAgent({ id: 'b', name: 'b', title: 'Agent B' })
  const c = makeAgent({ id: 'c', name: 'c', title: 'Agent C' })

  it('returns empty string when there are no relationships', () => {
    expect(buildDelegationSection(a, [], [a, b, c])).toBe('')
  })

  it('renders Reports to for incoming delegations only', () => {
    const section = buildDelegationSection(a, [
      { id: 'd', from: 'b', to: 'a', reason: 'review' },
    ], [a, b, c])
    expect(section).toContain('**Reports to:**')
    expect(section).toContain('- Agent B for review')
    expect(section).not.toContain('**Delegates to:**')
  })

  it('renders Delegates to for outgoing delegations only', () => {
    const section = buildDelegationSection(a, [
      { id: 'd', from: 'a', to: 'b', reason: 'implementation' },
    ], [a, b, c])
    expect(section).toContain('**Delegates to:**')
    expect(section).toContain('- Agent B for implementation')
    expect(section).not.toContain('**Reports to:**')
  })

  it('renders both Reports to and Delegates to when both exist', () => {
    const section = buildDelegationSection(a, [
      { id: 'd1', from: 'b', to: 'a', reason: 'r1' },
      { id: 'd2', from: 'a', to: 'c', reason: 'r2' },
    ], [a, b, c])
    expect(section).toContain('**Reports to:**')
    expect(section).toContain('**Delegates to:**')
  })

  it('omits "for {reason}" when reason is empty', () => {
    const section = buildDelegationSection(a, [
      { id: 'd', from: 'a', to: 'b', reason: '' },
    ], [a, b, c])
    expect(section).toContain('- Agent B')
    expect(section).not.toContain('for')
  })

  it('falls back to name when title is missing on the linked agent', () => {
    const noTitle = makeAgent({ id: 'b', name: 'b', title: '' })
    const section = buildDelegationSection(a, [
      { id: 'd', from: 'a', to: 'b', reason: '' },
    ], [a, noTitle])
    expect(section).toContain('- b')
  })

  it('falls back to id when the agent is missing from the list', () => {
    const section = buildDelegationSection(a, [
      { id: 'd', from: 'a', to: 'missing-id', reason: '' },
    ], [a])
    expect(section).toContain('- missing-id')
  })
})

describe('replaceDelegationSection', () => {
  it('replaces an existing ## Delegation section', () => {
    const original = `# Agent\n\n## Role\nRole text\n\n## Delegation\n\n**Reports to:** old\n`
    const updated = replaceDelegationSection(original, '## Delegation\n\n**Reports to:** new')
    expect(updated).toContain('**Reports to:** new')
    expect(updated).not.toContain('**Reports to:** old')
    expect(updated).toContain('## Role\nRole text')
  })

  it('appends ## Delegation when none exists', () => {
    const original = `# Agent\n\n## Role\nRole text\n`
    const updated = replaceDelegationSection(original, '## Delegation\n\n**Delegates to:**\n- X')
    expect(updated).toContain('## Role\nRole text')
    expect(updated).toContain('## Delegation\n\n**Delegates to:**\n- X')
  })

  it('removes the Delegation section when new content is empty', () => {
    const original = `# Agent\n\n## Role\nRole text\n\n## Delegation\n\nold delegation stuff\n`
    const updated = replaceDelegationSection(original, '')
    expect(updated).not.toContain('## Delegation')
    expect(updated).toContain('## Role\nRole text')
  })

  it('is a no-op when there is no section and no new content', () => {
    const original = `# Agent\n\n## Role\nRole text\n`
    expect(replaceDelegationSection(original, '')).toBe(original)
  })

  it('preserves H2 sections that follow ## Delegation', () => {
    const original = `# Agent\n\n## Role\nx\n\n## Delegation\n\nold\n\n## Notes\nkeep me\n`
    const updated = replaceDelegationSection(original, '## Delegation\n\nnew')
    expect(updated).toContain('## Notes\nkeep me')
    expect(updated).toContain('new')
  })

  it('preserves custom sections (like ### Gotchas) inside other H2s', () => {
    const original = `# Agent\n\n## Responsibilities\n### Gotchas\nbeware\n\n## Delegation\nold\n`
    const updated = replaceDelegationSection(original, '## Delegation\nnew')
    expect(updated).toContain('### Gotchas\nbeware')
  })
})

describe('parseAgentMd', () => {
  it('parses a standard agent file', () => {
    const content = `# My Agent\n\n## Role\nDoes things\n\n## Responsibilities\nThing A\nThing B\n\n## Goals\nWin\n`
    const agent = parseAgentMd(content, 'my-agent', 0, stableId(1))
    expect(agent.name).toBe('my-agent')
    expect(agent.title).toBe('My Agent')
    expect(agent.role).toBe('Does things')
    expect(agent.responsibilities).toBe('Thing A\nThing B')
    expect(agent.goals).toBe('Win')
  })

  it('falls back to filename when H1 is missing', () => {
    const content = `## Role\nx\n`
    const agent = parseAgentMd(content, 'fallback', 0, stableId(1))
    expect(agent.title).toBe('fallback')
  })

  it('uses Area of Expertise as Role fallback', () => {
    const content = `# X\n\n## Area of Expertise\nLegacy header\n`
    const agent = parseAgentMd(content, 'x', 0, stableId(1))
    expect(agent.role).toBe('Legacy header')
  })

  it('appends unknown H2 sections to Responsibilities as H3', () => {
    const content = `# X\n\n## Role\nr\n\n## Gotchas\ng\n\n## Notes\nn\n`
    const agent = parseAgentMd(content, 'x', 0, stableId(1))
    expect(agent.responsibilities).toContain('### Gotchas\ng')
    expect(agent.responsibilities).toContain('### Notes\nn')
  })

  it('places agents on a 4-column grid based on index', () => {
    const content = `# X\n## Role\nx\n`
    expect(parseAgentMd(content, 'a', 0, stableId(1)).position).toEqual({ x: 100, y: 100 })
    expect(parseAgentMd(content, 'a', 3, stableId(1)).position).toEqual({ x: 100 + 3 * 240, y: 100 })
    expect(parseAgentMd(content, 'a', 4, stableId(1)).position).toEqual({ x: 100, y: 280 })
  })

  it('uses the injected id generator for testability', () => {
    const content = `# X\n## Role\nx\n`
    const agent = parseAgentMd(content, 'x', 0, () => 'fixed-id')
    expect(agent.id).toBe('fixed-id')
  })

  it('survives a round trip through buildClaudeMd', () => {
    const original = makeAgent({
      id: 'rt',
      name: 'rt-agent',
      title: 'Round Trip',
      role: 'Tests round trips',
      responsibilities: 'Carries data',
      goals: 'No drift',
    })
    const md = buildClaudeMd(original, [], [])
    const parsed = parseAgentMd(md, 'rt-agent', 0, () => 'rt')
    expect(parsed.title).toBe(original.title)
    expect(parsed.role).toBe(original.role)
    expect(parsed.responsibilities).toBe(original.responsibilities)
    expect(parsed.goals).toBe(original.goals)
  })
})
