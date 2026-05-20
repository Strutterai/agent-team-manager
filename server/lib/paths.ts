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

// Allowed character set for agent file names: letters, digits,
// hyphen, underscore. Explicitly rejects path separators, `..`,
// dots, spaces, and any other shell-sensitive characters.
const AGENT_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

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

// Validate that an agent name is a safe filename component.
// Throws on path separators, traversal sequences, or any character
// outside the allowed set.
export function safeAgentName(name: string): string {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('Agent name must be a non-empty string')
  }
  if (name.length > 128) {
    throw new Error('Agent name must be 128 characters or fewer')
  }
  if (!AGENT_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid agent name: ${name}. Only letters, digits, hyphens, and underscores are allowed.`
    )
  }
  return name
}

// Resolve a child path inside the given root directory and verify
// the result stays within the root. Throws if the child would escape.
// This is the recommended pattern for path-injection sanitization:
// resolve fully, then explicitly check containment with startsWith.
export function safeChildPath(root: string, child: string): string {
  const rootResolved = path.resolve(root)
  const childResolved = path.resolve(rootResolved, child)
  if (
    childResolved !== rootResolved &&
    !childResolved.startsWith(rootResolved + path.sep)
  ) {
    throw new Error(`Path escapes root: ${child}`)
  }
  return childResolved
}
