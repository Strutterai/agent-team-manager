import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { createReadStream } from 'fs'
import type {
  SessionMeta,
  SessionReplay,
  TimelineEvent,
} from '../../src/types/agent.js'
import { expandHome, safeChildPath } from './paths.js'

// Claude Code stores sessions under ~/.claude/projects/<hashed-path>/
// where the hashed path is the absolute project path with '/' replaced by '-'.
// e.g. /home/user/agent-team-manager -> -home-user-agent-team-manager
export function projectHashForCwd(absPath: string): string {
  if (!absPath || typeof absPath !== 'string') {
    throw new Error('projectHash: path must be a non-empty string')
  }
  if (!path.isAbsolute(absPath)) {
    throw new Error(`projectHash: path must be absolute: ${absPath}`)
  }
  if (absPath.includes('..')) {
    throw new Error(`projectHash: path must not contain '..': ${absPath}`)
  }
  return absPath.replace(/\//g, '-')
}

export function sessionsRoot(home: string = process.env.HOME || ''): string {
  if (!home) throw new Error('HOME is not set')
  return path.resolve(home, '.claude', 'projects')
}

// UUID-shape validator. Mirrors safeAgentName in paths.ts.
const SESSION_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
export function safeSessionId(id: string): string {
  if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) {
    throw new Error(`Invalid session id: ${id}`)
  }
  return id
}

// Resolve the directory for a project's session logs. Throws on any
// path safety violation. Does not require the directory to exist.
function projectSessionsDir(projectAbsPath: string): string {
  const resolvedProject = expandHome(projectAbsPath)
  const hash = projectHashForCwd(resolvedProject)
  return safeChildPath(sessionsRoot(), hash)
}

export function listSessions(projectAbsPath: string): SessionMeta[] {
  const dir = projectSessionsDir(projectAbsPath)
  if (!fs.existsSync(dir)) return []

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => f.replace(/\.jsonl$/, ''))
    .filter((id) => SESSION_ID_PATTERN.test(id))

  const out: SessionMeta[] = []
  for (const sessionId of files) {
    const file = safeChildPath(dir, `${sessionId}.jsonl`)
    const stat = fs.statSync(file)
    out.push({
      sessionId,
      title: peekTitle(file) || sessionId,
      startedAt: stat.birthtimeMs || stat.mtimeMs,
      endedAt: stat.mtimeMs,
      sizeBytes: stat.size,
    })
  }
  out.sort((a, b) => b.endedAt - a.endedAt)
  return out
}

// Peek the first ~64KB of a session file for an ai-title or summary.
// Avoids loading the full transcript when only a label is needed.
function peekTitle(file: string): string | null {
  const fd = fs.openSync(file, 'r')
  try {
    const buf = Buffer.alloc(64 * 1024)
    const bytes = fs.readSync(fd, buf, 0, buf.length, 0)
    const text = buf.slice(0, bytes).toString('utf-8')
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      try {
        const d = JSON.parse(line)
        if (d.type === 'ai-title' && typeof d.aiTitle === 'string') return d.aiTitle
        if (d.type === 'summary' && typeof d.summary === 'string') return d.summary
      } catch {
        // Partial line at the read boundary; ignore.
      }
    }
  } finally {
    fs.closeSync(fd)
  }
  return null
}

export async function parseSession(
  projectAbsPath: string,
  sessionId: string
): Promise<SessionReplay> {
  safeSessionId(sessionId)
  const dir = projectSessionsDir(projectAbsPath)
  const parentFile = safeChildPath(dir, `${sessionId}.jsonl`)
  if (!fs.existsSync(parentFile)) {
    throw new Error(`Session not found: ${sessionId}`)
  }
  const subagentDir = safeChildPath(safeChildPath(dir, sessionId), 'subagents')

  const events: TimelineEvent[] = []
  const laneKeys = new Set<string>(['main'])

  // First pass: parent file. Build toolUseId -> laneKey/subagentType map for
  // Task tool_use blocks so we can also classify subagent files by lane.
  const taskByToolUse = new Map<string, { subagentType: string; ts: number }>()
  await streamJsonl(parentFile, (d) => {
    classifyParentLine(d, events, taskByToolUse)
  })

  // Second pass: subagent files. The meta.json sidecar names the lane.
  if (fs.existsSync(subagentDir)) {
    const subFiles = fs
      .readdirSync(subagentDir)
      .filter((f) => f.endsWith('.jsonl'))
    for (const file of subFiles) {
      const full = safeChildPath(subagentDir, file)
      const metaPath = full.replace(/\.jsonl$/, '.meta.json')
      const meta = readSubagentMeta(metaPath)
      const laneKey = meta.agentType || 'subagent'
      laneKeys.add(laneKey)
      await classifySubagentFile(full, laneKey, events)
    }
  }

  events.sort((a, b) => a.ts - b.ts)
  const startedAt = events.length ? events[0].ts : 0
  const endedAt = events.length ? events[events.length - 1].ts : 0

  return {
    sessionId,
    startedAt,
    endedAt,
    laneKeys: Array.from(laneKeys),
    events,
  }
}

interface SubagentMeta {
  agentType?: string
  description?: string
  toolUseId?: string
}

function readSubagentMeta(metaPath: string): SubagentMeta {
  if (!fs.existsSync(metaPath)) return {}
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as SubagentMeta
  } catch {
    return {}
  }
}

async function streamJsonl(
  file: string,
  onLine: (d: Record<string, unknown>) => void
): Promise<void> {
  const rl = readline.createInterface({
    input: createReadStream(file, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  })
  for await (const line of rl) {
    if (!line.trim()) continue
    try {
      const d = JSON.parse(line)
      onLine(d)
    } catch {
      // Skip malformed lines; transcripts can have trailing partial writes.
    }
  }
}

function parseTs(s: unknown): number | null {
  if (typeof s !== 'string') return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}

function previewText(s: unknown, max = 140): string {
  if (typeof s !== 'string') return ''
  const trimmed = s.replace(/\s+/g, ' ').trim()
  return trimmed.length > max ? trimmed.slice(0, max - 1) + '…' : trimmed
}

function classifyParentLine(
  d: Record<string, unknown>,
  events: TimelineEvent[],
  taskByToolUse: Map<string, { subagentType: string; ts: number }>
): void {
  const type = d.type as string | undefined

  if (type === 'queue-operation' && d.operation === 'enqueue') {
    const ts = parseTs(d.timestamp)
    if (ts === null) return
    events.push({
      id: `qop-${ts}-${events.length}`,
      ts,
      laneKey: 'main',
      kind: 'message',
      role: 'user',
      preview: previewText(d.content),
      label: previewText(d.content, 60) || 'user prompt',
    })
    return
  }

  if (type === 'system' && d.subtype === 'stop_hook_summary') {
    const ts = parseTs(d.timestamp)
    if (ts === null) return
    const infos = Array.isArray(d.hookInfos) ? (d.hookInfos as Array<Record<string, unknown>>) : []
    for (const info of infos) {
      const command = typeof info.command === 'string' ? info.command : 'hook'
      const durationMs = typeof info.durationMs === 'number' ? info.durationMs : undefined
      events.push({
        id: `hook-${ts}-${events.length}`,
        ts,
        laneKey: 'main',
        kind: 'hook',
        operation: command,
        durationMs,
        label: `Stop: ${path.basename(command)}`,
      })
    }
    return
  }

  if (type === 'assistant') {
    classifyAssistantLine(d, 'main', events, taskByToolUse)
    return
  }
}

function classifySubagentFile(
  file: string,
  laneKey: string,
  events: TimelineEvent[]
): Promise<void> {
  let firstTs: number | null = null
  let lastTs: number | null = null
  return streamJsonl(file, (d) => {
    const ts = parseTs(d.timestamp)
    if (ts !== null) {
      if (firstTs === null) firstTs = ts
      lastTs = ts
    }
    if (d.type === 'assistant') {
      classifyAssistantLine(d, laneKey, events, null)
    } else if (d.type === 'user') {
      // Subagent user lines are tool_results from the parent or the initial
      // prompt; skip them on the timeline.
    }
  }).then(() => {
    if (firstTs !== null) {
      events.push({
        id: `start-${laneKey}-${firstTs}`,
        ts: firstTs,
        laneKey,
        kind: 'agent-start',
        subagentType: laneKey,
        label: `${laneKey} starts`,
      })
    }
    if (lastTs !== null && lastTs !== firstTs) {
      events.push({
        id: `end-${laneKey}-${lastTs}`,
        ts: lastTs,
        laneKey,
        kind: 'agent-end',
        subagentType: laneKey,
        label: `${laneKey} ends`,
      })
    }
  })
}

function classifyAssistantLine(
  d: Record<string, unknown>,
  laneKey: string,
  events: TimelineEvent[],
  taskByToolUse: Map<string, { subagentType: string; ts: number }> | null
): void {
  const ts = parseTs(d.timestamp)
  if (ts === null) return

  const message = d.message as { content?: unknown } | undefined
  const content = message?.content
  if (!Array.isArray(content)) return

  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    const b = block as Record<string, unknown>
    if (b.type !== 'tool_use') continue

    const toolUseId = typeof b.id === 'string' ? b.id : `tu-${ts}`
    const name = typeof b.name === 'string' ? b.name : 'tool'
    const input = b.input

    if (name === 'Task' || name === 'Agent') {
      const inp = (input as Record<string, unknown>) || {}
      const subagentType =
        typeof inp.subagent_type === 'string' ? inp.subagent_type : 'subagent'
      const prompt = typeof inp.prompt === 'string' ? inp.prompt : ''
      const description =
        typeof inp.description === 'string' ? inp.description : subagentType
      if (taskByToolUse) taskByToolUse.set(toolUseId, { subagentType, ts })
      events.push({
        id: `del-${toolUseId}`,
        ts,
        laneKey,
        kind: 'delegation',
        toLaneKey: subagentType,
        subagentType,
        prompt,
        toolUseId,
        label: `→ ${subagentType}: ${description}`,
      })
      continue
    }

    if (name === 'Skill') {
      const inp = (input as Record<string, unknown>) || {}
      const skill = typeof inp.skill === 'string' ? inp.skill : 'skill'
      events.push({
        id: `skl-${toolUseId}`,
        ts,
        laneKey,
        kind: 'skill',
        skill,
        input,
        label: `/${skill}`,
      })
      continue
    }

    events.push({
      id: `tool-${toolUseId}`,
      ts,
      laneKey,
      kind: 'tool',
      toolName: name,
      input,
      label: toolLabel(name, input),
    })
  }
}

function toolLabel(name: string, input: unknown): string {
  const inp = (input as Record<string, unknown>) || {}
  if (name === 'Bash' && typeof inp.description === 'string') {
    return `Bash: ${inp.description}`
  }
  if (typeof inp.file_path === 'string') {
    return `${name}: ${path.basename(inp.file_path)}`
  }
  if (typeof inp.pattern === 'string') return `${name}: ${inp.pattern}`
  return name
}
