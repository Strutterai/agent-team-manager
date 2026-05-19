import { useState } from 'react'

const SETUP_PROMPT = `I want to set up an agent team for this project using Claude Code. Help me design the team and create the agent files in the format below.

## Required file structure

Create one file per agent at \`.claude/agents/{kebab-case-name}.md\` with this exact section order:

\`\`\`markdown
# {Title Case Agent Name}

## Role
One or two sentences describing what this agent does and why it exists.

## Responsibilities
- Bulleted list of what this agent owns
- Include codebase patterns, conventions, file paths, gotchas
- Use ### subsections to group related responsibilities (e.g., "### Testing", "### API Patterns")

## Goals
- What success looks like for this agent
- Quality bars to enforce

## Delegation
**Reports to:**
- {Other Agent Title} for {short reason}

**Delegates to:**
- {Other Agent Title} for {short reason}
\`\`\`

The Delegation section is optional on first pass. I will wire it up visually after.

## How to design the team

1. **Ask me about the project first.** What does it do, who uses it, what's the tech stack, what are the main workflows.
2. **Propose 6-15 agents** organized into logical groups. A typical team has:
   - A **Lead Agent** that orchestrates and delegates (does not implement)
   - **Planning** (Architect)
   - **Implementation** (general Code Agent plus feature-specific specialists if the codebase has clear domains)
   - **Quality** (Review, optionally Security)
   - **Bug fixing** (Fix Agent)
   - **DevOps** (CI/CD, Database)
   - **Marketing/Content** if relevant (Strategist + Writer + Social)
   - **Post-merge** (Release Notes)
3. **Show me the proposed list with one-line role descriptions.** Get my approval before writing files.
4. **Write the .md files.** Make the Responsibilities section rich: include real file paths, real conventions you observe in the codebase, real gotchas. Generic content is useless. Read the code first.
5. **Use kebab-case file names** (e.g., \`code-agent.md\`, \`fix-import-agent.md\`, \`release-notes-agent.md\`).
6. **Skip the Delegation section for now.** I will draw the org chart visually in Agent Team Manager and it will sync the delegation lines back to each file.

## After you finish

Tell me to open Agent Team Manager and point the "Agents directory" field at this project's \`.claude\` folder. The tool will auto-load every agent file.

Start by asking me what this project does.`

export function SetupPromptModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SETUP_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-border-1 bg-surface-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-1 px-5 py-4">
          <div>
            <h2 className="font-display text-xl tracking-wide text-text-1">
              BOOTSTRAP YOUR AGENT TEAM
            </h2>
            <p className="text-xs text-text-3 mt-1">
              Copy this prompt into a Claude Code session in your project root. Claude will design the team and create the .md files.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-3 hover:text-text-1 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-surface-3 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Prompt body */}
        <div className="flex-1 overflow-y-auto p-5">
          <pre className="whitespace-pre-wrap font-mono text-xs text-text-2 bg-surface-1 border border-border-1 rounded-md p-4 leading-relaxed">
            {SETUP_PROMPT}
          </pre>
        </div>

        {/* Footer */}
        <div className="border-t border-border-1 px-5 py-4 flex items-center justify-between gap-3">
          <div className="text-xs text-text-3">
            Tip: run this from your project root so Claude can read the codebase before writing agent files.
          </div>
          <button
            onClick={handleCopy}
            className={`
              shrink-0 rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors
              ${copied
                ? 'bg-brand text-surface-0'
                : 'bg-brand text-surface-0 hover:bg-brand-light'
              }
            `}
          >
            {copied ? '✓ Copied' : 'Copy prompt'}
          </button>
        </div>
      </div>
    </div>
  )
}
