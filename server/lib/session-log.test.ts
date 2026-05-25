import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  projectHashForCwd,
  safeSessionId,
  listSessions,
  parseSession,
} from './session-log.js'

describe('projectHashForCwd', () => {
  it('replaces forward slashes with dashes', () => {
    expect(projectHashForCwd('/home/user/agent-team-manager')).toBe(
      '-home-user-agent-team-manager'
    )
  })

  it('preserves the leading dash from the root slash', () => {
    expect(projectHashForCwd('/Users/alice/proj')).toBe('-Users-alice-proj')
  })

  it('rejects relative paths', () => {
    expect(() => projectHashForCwd('relative/path')).toThrow(/absolute/)
  })

  it("rejects paths containing '..'", () => {
    expect(() => projectHashForCwd('/foo/../bar')).toThrow(/\.\./)
  })

  it('rejects empty input', () => {
    expect(() => projectHashForCwd('')).toThrow(/non-empty/)
  })
})

describe('safeSessionId', () => {
  it('accepts a valid UUID', () => {
    expect(safeSessionId('90026315-e3e7-4ee3-b339-aa2d0adb5f76')).toBe(
      '90026315-e3e7-4ee3-b339-aa2d0adb5f76'
    )
  })

  it('rejects a traversal attempt', () => {
    expect(() => safeSessionId('../foo')).toThrow(/Invalid session id/)
  })

  it('rejects a non-UUID string', () => {
    expect(() => safeSessionId('not-a-uuid')).toThrow(/Invalid session id/)
  })

  it('rejects URL-encoded traversal', () => {
    expect(() => safeSessionId('..%2fetc%2fpasswd')).toThrow(/Invalid session id/)
  })
})

// Fixture-based tests for listSessions + parseSession. We build a fake home
// directory with the same layout Claude Code uses.
describe('listSessions / parseSession (fixture)', () => {
  let tmpHome: string
  let savedHome: string | undefined
  const sessionId = '11111111-2222-3333-4444-555555555555'
  // Reuses tmp project path; hash is derived from this real abs path.
  const projectPath = '/tmp/atm-fixture-project'
  const projectHash = '-tmp-atm-fixture-project'

  beforeEach(() => {
    savedHome = process.env.HOME
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'atm-home-'))
    process.env.HOME = tmpHome

    const projectDir = path.join(tmpHome, '.claude', 'projects', projectHash)
    fs.mkdirSync(projectDir, { recursive: true })

    const parentLines = [
      JSON.stringify({
        type: 'ai-title',
        aiTitle: 'Demo session',
        sessionId,
      }),
      JSON.stringify({
        type: 'queue-operation',
        operation: 'enqueue',
        timestamp: '2026-05-25T16:00:00.000Z',
        sessionId,
        content: 'hello world',
      }),
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-05-25T16:00:01.000Z',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_bash1',
              name: 'Bash',
              input: { command: 'ls', description: 'list files' },
            },
            {
              type: 'tool_use',
              id: 'toolu_task1',
              name: 'Task',
              input: {
                subagent_type: 'Explore',
                description: 'search the codebase',
                prompt: 'find things',
              },
            },
          ],
        },
      }),
      JSON.stringify({
        type: 'system',
        subtype: 'stop_hook_summary',
        timestamp: '2026-05-25T16:00:02.000Z',
        hookCount: 1,
        hookInfos: [{ command: '~/.claude/some-hook.sh', durationMs: 42 }],
      }),
    ]
    fs.writeFileSync(
      path.join(projectDir, `${sessionId}.jsonl`),
      parentLines.join('\n') + '\n'
    )

    // Subagent file + meta sidecar
    const subDir = path.join(projectDir, sessionId, 'subagents')
    fs.mkdirSync(subDir, { recursive: true })
    fs.writeFileSync(
      path.join(subDir, 'agent-abc123.meta.json'),
      JSON.stringify({
        agentType: 'Explore',
        description: 'search the codebase',
        toolUseId: 'toolu_task1',
      })
    )
    const subLines = [
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-05-25T16:00:01.500Z',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_grep1',
              name: 'Grep',
              input: { pattern: 'foo' },
            },
          ],
        },
      }),
    ]
    fs.writeFileSync(
      path.join(subDir, 'agent-abc123.jsonl'),
      subLines.join('\n') + '\n'
    )
  })

  afterEach(() => {
    if (savedHome === undefined) delete process.env.HOME
    else process.env.HOME = savedHome
    fs.rmSync(tmpHome, { recursive: true, force: true })
  })

  it('listSessions returns the fixture session with its ai-title', () => {
    const sessions = listSessions(projectPath)
    expect(sessions).toHaveLength(1)
    expect(sessions[0].sessionId).toBe(sessionId)
    expect(sessions[0].title).toBe('Demo session')
  })

  it('parseSession emits message, tool, delegation, and hook events in order', async () => {
    const replay = await parseSession(projectPath, sessionId)
    expect(replay.sessionId).toBe(sessionId)
    expect(replay.laneKeys).toContain('main')
    expect(replay.laneKeys).toContain('Explore')

    const kinds = replay.events.map((e) => e.kind)
    expect(kinds).toContain('message')
    expect(kinds).toContain('tool')
    expect(kinds).toContain('delegation')
    expect(kinds).toContain('hook')
    expect(kinds).toContain('agent-start')

    // Sorted by ts
    const tss = replay.events.map((e) => e.ts)
    const sorted = [...tss].sort((a, b) => a - b)
    expect(tss).toEqual(sorted)
  })

  it('parseSession rejects a malformed session id', async () => {
    await expect(parseSession(projectPath, '../foo')).rejects.toThrow(
      /Invalid session id/
    )
  })

  it('parseSession links delegation toLaneKey to the subagent lane', async () => {
    const replay = await parseSession(projectPath, sessionId)
    const delegation = replay.events.find((e) => e.kind === 'delegation')
    expect(delegation).toBeDefined()
    if (delegation && delegation.kind === 'delegation') {
      expect(delegation.toLaneKey).toBe('Explore')
    }
  })
})
