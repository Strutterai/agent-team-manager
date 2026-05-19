import path from 'path'

// Well-known system locations the user can't usefully point this tool at.
// Refused both to prevent typos from clobbering system files and as defense
// in depth even though CORS already restricts the API to localhost.
const BLOCKED_ROOTS = [
  '/etc',
  '/var',
  '/sys',
  '/proc',
  '/boot',
  '/sbin',
  '/dev',
  '/System',
  '/private/etc',
]

// Expand ~ and canonicalize the path. After resolution the path is
// absolute and contains no `..` segments. Throws if the resolved path
// targets a sensitive system directory.
export function expandHome(p: string, home: string = process.env.HOME || ''): string {
  if (!p || typeof p !== 'string') {
    throw new Error('outputDirectory must be a non-empty string')
  }
  const expanded = p.replace(/^~(?=$|\/|\\)/, home)
  const resolved = path.resolve(expanded)

  for (const root of BLOCKED_ROOTS) {
    if (resolved === root || resolved.startsWith(root + path.sep)) {
      throw new Error(`Refusing to access system directory: ${resolved}`)
    }
  }
  return resolved
}
