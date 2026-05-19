# Security Policy

## Supported versions

Only the `main` branch is supported. There are no LTS or maintenance branches yet.

## Reporting a vulnerability

If you discover a security issue in Agent Team Manager, please report it **privately**. Do not open a public GitHub issue.

Preferred channels (any one):

1. [GitHub private vulnerability reporting](https://github.com/Strutterai/agent-team-manager/security/advisories/new) on this repo
2. Email **security@strutterai.com**

Please include:

- A description of the issue and its impact
- Steps to reproduce, with a minimal proof of concept if you have one
- Any suggested fixes

We aim to acknowledge reports within 3 business days and to triage within 7. After triage we'll coordinate disclosure timing with you.

## Threat model (what we care about)

Agent Team Manager is a **local-only development tool**. The Express backend binds to `127.0.0.1` and CORS is restricted to `localhost:5173`. Within that scope, the following are in scope for security reports:

- Path traversal or escape through the "Agents directory" input
- Cross-origin attacks against the local API
- Persisted XSS or HTML injection in the canvas via crafted agent files
- Dependency vulnerabilities exposed by published `npm audit` runs
- Documentation that leads users to commit secrets or sensitive files

## Out of scope

- Multi-tenant isolation: this tool is single-user by design
- Network-exposed server attacks: the server does not bind to a public interface
- Vulnerabilities that require local privileged access to the host
- Issues in third-party Claude Code itself; report those to Anthropic
