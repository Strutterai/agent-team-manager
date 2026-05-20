import { describe, it, expect } from 'vitest'
import path from 'path'
import { expandHome, safeAgentName, safeChildPath } from './paths.js'

describe('expandHome', () => {
  const HOME = '/Users/test'

  it('expands a leading ~ to the home directory', () => {
    expect(expandHome('~/projects/foo', HOME)).toBe('/Users/test/projects/foo')
  })

  it('expands a bare ~', () => {
    expect(expandHome('~', HOME)).toBe('/Users/test')
  })

  it('returns absolute paths unchanged after resolution', () => {
    expect(expandHome('/Users/test/foo', HOME)).toBe('/Users/test/foo')
  })

  it('canonicalizes .. segments', () => {
    expect(expandHome('/Users/test/foo/../bar', HOME)).toBe('/Users/test/bar')
  })

  it('does not expand ~ in the middle of a path', () => {
    // path.resolve treats this as a relative path joined to cwd
    const result = expandHome('foo/~bar', HOME)
    expect(result).toBe(path.resolve('foo/~bar'))
  })

  it('rejects empty string', () => {
    expect(() => expandHome('', HOME)).toThrow(/non-empty string/)
  })

  it('rejects non-string input', () => {
    // @ts-expect-error testing runtime guard
    expect(() => expandHome(null, HOME)).toThrow(/non-empty string/)
    // @ts-expect-error testing runtime guard
    expect(() => expandHome(undefined, HOME)).toThrow(/non-empty string/)
  })

  it.each([
    '/etc',
    '/etc/passwd',
    '/var/log',
    '/sys/devices',
    '/proc/1',
    '/boot/grub',
    '/sbin/init',
    '/dev/null',
    '/System/Library',
    '/private/etc/hosts',
  ])('rejects system path: %s', (badPath) => {
    expect(() => expandHome(badPath, HOME)).toThrow(/Refusing to access system directory/)
  })

  it('rejects a traversal attempt that resolves into a blocked root', () => {
    expect(() => expandHome('/Users/test/../../etc/passwd', HOME)).toThrow(
      /Refusing to access system directory/
    )
  })

  it('does NOT reject paths whose names happen to start with a blocked prefix', () => {
    // /etcetera is fine; only path-segment matches should block
    expect(expandHome('/etcetera', HOME)).toBe('/etcetera')
  })
})

describe('safeAgentName', () => {
  it.each([
    'code-agent',
    'review_agent',
    'frontend',
    'a',
    'ABC123',
    'mixed_case-Name42',
  ])('accepts valid name: %s', (name) => {
    expect(safeAgentName(name)).toBe(name)
  })

  it.each([
    '',
    '../etc/passwd',
    'agent/with/slash',
    'agent\\with\\backslash',
    'agent.with.dots',
    'agent with spaces',
    'agent\nname',
    '..',
    '.',
    '$malicious',
    'agent;rm -rf',
  ])('rejects invalid name: %s', (name) => {
    expect(() => safeAgentName(name)).toThrow()
  })

  it('rejects names longer than 128 chars', () => {
    expect(() => safeAgentName('a'.repeat(129))).toThrow(/128 characters/)
  })

  it('accepts the boundary length', () => {
    const name = 'a'.repeat(128)
    expect(safeAgentName(name)).toBe(name)
  })

  it('rejects non-string input', () => {
    // @ts-expect-error testing runtime guard
    expect(() => safeAgentName(null)).toThrow()
    // @ts-expect-error testing runtime guard
    expect(() => safeAgentName(undefined)).toThrow()
    // @ts-expect-error testing runtime guard
    expect(() => safeAgentName(42)).toThrow()
  })
})

describe('safeChildPath', () => {
  it('resolves a normal child inside the root', () => {
    expect(safeChildPath('/Users/test/proj', 'agents')).toBe('/Users/test/proj/agents')
  })

  it('resolves a multi-segment child', () => {
    expect(safeChildPath('/Users/test/proj', 'agents/code-agent.md')).toBe(
      '/Users/test/proj/agents/code-agent.md'
    )
  })

  it('returns the root itself when child is "."', () => {
    expect(safeChildPath('/Users/test/proj', '.')).toBe('/Users/test/proj')
  })

  it('throws when child escapes via ..', () => {
    expect(() => safeChildPath('/Users/test/proj', '../other')).toThrow(/escapes root/)
  })

  it('throws when child is an absolute path outside the root', () => {
    expect(() => safeChildPath('/Users/test/proj', '/etc/passwd')).toThrow(/escapes root/)
  })

  it('throws when child uses .. deeper than the root depth', () => {
    expect(() => safeChildPath('/Users/test/proj', '../../../../etc/passwd')).toThrow(
      /escapes root/
    )
  })

  it('does not confuse sibling-prefix paths with containment', () => {
    // /Users/test/projects is NOT inside /Users/test/proj
    expect(() =>
      safeChildPath('/Users/test/proj', '../projects/other')
    ).toThrow(/escapes root/)
  })

  it('resolves .. that stays within the root', () => {
    // agents/../docs is within /Users/test/proj
    expect(safeChildPath('/Users/test/proj', 'agents/../docs')).toBe(
      '/Users/test/proj/docs'
    )
  })
})
