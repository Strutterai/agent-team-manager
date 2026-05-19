import { describe, it, expect } from 'vitest'
import path from 'path'
import { expandHome } from './paths.js'

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
