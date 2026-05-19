import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { OrgChart, Agent, Delegation } from '../../src/types/agent.js'

export const router = Router()

const CHART_FILE = path.join(process.cwd(), 'org-chart.json')

const defaultChart: OrgChart = {
  outputDirectory: path.join(process.env.HOME || '~', '.claude'),
  agents: [],
  delegations: [],
}

router.get('/chart', (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(CHART_FILE)) {
      return res.json(defaultChart)
    }
    const data = fs.readFileSync(CHART_FILE, 'utf-8')
    res.json(JSON.parse(data))
  } catch {
    res.json(defaultChart)
  }
})

router.post('/chart', (req: Request, res: Response) => {
  try {
    fs.writeFileSync(CHART_FILE, JSON.stringify(req.body, null, 2))
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/export', (req: Request, res: Response) => {
  try {
    const chart: OrgChart = req.body
    const agentsDir = path.join(chart.outputDirectory, 'agents')

    fs.mkdirSync(agentsDir, { recursive: true })

    const written: string[] = []
    for (const agent of chart.agents) {
      const content = buildClaudeMd(agent, chart.delegations, chart.agents)
      const filePath = path.join(agentsDir, `${agent.name}.md`)
      fs.writeFileSync(filePath, content)
      written.push(filePath)
    }

    res.json({ ok: true, files: written })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

function buildClaudeMd(agent: Agent, delegations: Delegation[], allAgents: Agent[]): string {
  const outgoing = delegations.filter((d) => d.from === agent.id)
  const incoming = delegations.filter((d) => d.to === agent.id)

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

  if (outgoing.length > 0 || incoming.length > 0) {
    lines.push('', '## Delegation')

    if (incoming.length > 0) {
      const parents = incoming.map((d) => {
        const parent = allAgents.find((a) => a.id === d.from)
        return parent?.title || parent?.name || d.from
      })
      lines.push(`Reports to: ${parents.join(', ')}`)
    }

    if (outgoing.length > 0) {
      lines.push('', 'Delegates to:')
      for (const d of outgoing) {
        const child = allAgents.find((a) => a.id === d.to)
        const childName = child?.title || child?.name || d.to
        lines.push(`- **${childName}** — ${d.reason || 'no reason specified'}`)
      }
    }
  }

  lines.push('')
  return lines.join('\n')
}
