import crypto from 'crypto'
import type { Agent, Delegation } from '../../src/types/agent.js'

// Sections that map directly to an Agent field. Anything else gets
// preserved as an H3 subsection inside Responsibilities so nothing is lost
// on round-trip.
const KNOWN_SECTIONS = new Set([
  'role', 'area of expertise', 'expertise', 'purpose',
  'responsibilities', 'codebase patterns', 'patterns',
  'goals', 'decisions made', 'decisions',
  'delegation',
])

// Build the full markdown file content for an agent.
export function buildClaudeMd(
  agent: Agent,
  delegations: Delegation[],
  allAgents: Agent[]
): string {
  const lines: string[] = [
    `# ${agent.title || agent.name}`,
    '',
    '## Role',
    agent.role || '',
    '',
    '## Responsibilities',
    agent.responsibilities || '',
    '',
    '## Goals',
    agent.goals || '',
  ]

  const delegation = buildDelegationSection(agent, delegations, allAgents)
  if (delegation) {
    lines.push('', delegation)
  }
  lines.push('')
  return lines.join('\n')
}

// Build the "## Delegation" markdown block for an agent.
// Returns empty string if the agent has no delegation relationships.
export function buildDelegationSection(
  agent: Agent,
  delegations: Delegation[],
  allAgents: Agent[]
): string {
  const outgoing = delegations.filter((d) => d.from === agent.id)
  const incoming = delegations.filter((d) => d.to === agent.id)

  if (outgoing.length === 0 && incoming.length === 0) return ''

  const name = (id: string) => {
    const a = allAgents.find((x) => x.id === id)
    return a?.title || a?.name || id
  }

  const lines: string[] = ['## Delegation']

  if (incoming.length > 0) {
    lines.push('', '**Reports to:**')
    for (const d of incoming) {
      lines.push(`- ${name(d.from)}${d.reason ? ` for ${d.reason}` : ''}`)
    }
  }

  if (outgoing.length > 0) {
    lines.push('', '**Delegates to:**')
    for (const d of outgoing) {
      lines.push(`- ${name(d.to)}${d.reason ? ` for ${d.reason}` : ''}`)
    }
  }

  return lines.join('\n')
}

// Replace an existing "## Delegation" section in a markdown file with new content.
// If no section exists, append it at the end. Preserves all other content.
// Pass empty newSection to remove the existing section entirely.
export function replaceDelegationSection(original: string, newSection: string): string {
  const trimmed = original.replace(/\s+$/, '')

  // Match "## Delegation" through end-of-file or next H2/H1
  const re = /\n## Delegation\b[\s\S]*?(?=\n## |\n# |$)/

  if (re.test(trimmed)) {
    if (!newSection) {
      return trimmed.replace(re, '') + '\n'
    }
    return trimmed.replace(re, '\n' + newSection) + '\n'
  }

  if (!newSection) return original
  return trimmed + '\n\n' + newSection + '\n'
}

// Parse an agent markdown file into an Agent object. Maps common section
// header variants to standard fields. Preserves unknown sections as
// H3 subsections inside Responsibilities.
export function parseAgentMd(
  content: string,
  fileName: string,
  idx: number,
  idGenerator: () => string = () => crypto.randomUUID()
): Agent {
  const lines = content.split('\n')
  const titleMatch = lines.find((l) => l.startsWith('# '))
  const title = titleMatch ? titleMatch.replace(/^#\s+/, '').trim() : fileName

  const sections: Record<string, string> = {}
  let currentHeading: string | null = null
  let buffer: string[] = []

  const flush = () => {
    if (currentHeading) {
      sections[currentHeading.toLowerCase()] = buffer.join('\n').trim()
    }
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush()
      currentHeading = line.replace(/^##\s+/, '').trim()
      buffer = []
    } else if (currentHeading) {
      buffer.push(line)
    }
  }
  flush()

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (sections[k.toLowerCase()]) return sections[k.toLowerCase()]
    }
    return ''
  }

  const role = pick('Role', 'Area of Expertise', 'Expertise', 'Purpose')
  const responsibilities = pick('Responsibilities', 'Codebase Patterns', 'Patterns')
  const goals = pick('Goals', 'Decisions Made', 'Decisions')

  const extras: string[] = []
  for (const [heading, body] of Object.entries(sections)) {
    if (!KNOWN_SECTIONS.has(heading)) {
      extras.push(`### ${heading.replace(/\b\w/g, (c) => c.toUpperCase())}\n${body}`)
    }
  }
  const fullResponsibilities = [responsibilities, ...extras].filter(Boolean).join('\n\n')

  // Default grid layout: 4 columns. Caller can override position after.
  const col = idx % 4
  const row = Math.floor(idx / 4)

  return {
    id: idGenerator(),
    name: fileName,
    title,
    role,
    responsibilities: fullResponsibilities,
    goals,
    position: { x: 100 + col * 240, y: 100 + row * 180 },
  }
}
