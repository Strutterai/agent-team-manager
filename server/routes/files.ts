import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import type { OrgChart, Agent, Delegation } from '../../src/types/agent.js'
import {
  buildClaudeMd,
  buildDelegationSection,
  parseAgentMd,
  replaceDelegationSection,
} from '../lib/agent-md.js'
import { expandHome } from '../lib/paths.js'

export const router = Router()

const CHART_FILE = path.join(process.cwd(), 'org-chart.json')

const defaultChart: OrgChart = {
  outputDirectory: path.join(process.env.HOME || '~', '.claude'),
  agents: [],
  delegations: [],
}

router.get('/chart', (_req: Request, res: Response) => {
  try {
    const chart: OrgChart = fs.existsSync(CHART_FILE)
      ? JSON.parse(fs.readFileSync(CHART_FILE, 'utf-8'))
      : defaultChart

    const merged = mergeWithDisk(chart)
    res.json(merged)
  } catch (err) {
    res.status(500).json({ error: String(err) })
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

// Re-read agents from disk for a given directory, merged with any saved
// positions/delegations. Used when the user changes the directory.
router.post('/reload', (req: Request, res: Response) => {
  try {
    const { outputDirectory } = req.body as { outputDirectory: string }
    const chart: OrgChart = fs.existsSync(CHART_FILE)
      ? JSON.parse(fs.readFileSync(CHART_FILE, 'utf-8'))
      : defaultChart
    chart.outputDirectory = outputDirectory
    const merged = mergeWithDisk(chart)
    res.json(merged)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/export', (req: Request, res: Response) => {
  try {
    const chart: OrgChart = req.body
    const agentsDir = path.join(expandHome(chart.outputDirectory), 'agents')

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

// Save a single agent's .md file. Writes Role/Responsibilities/Goals/Delegation
// from the panel state and creates the file if it doesn't exist.
router.post('/save-agent', (req: Request, res: Response) => {
  try {
    const { outputDirectory, agent, agents, delegations } = req.body as {
      outputDirectory: string
      agent: Agent
      agents: Agent[]
      delegations: Delegation[]
    }
    const agentsDir = path.join(expandHome(outputDirectory), 'agents')
    fs.mkdirSync(agentsDir, { recursive: true })

    const filePath = path.join(agentsDir, `${agent.name}.md`)
    const content = buildClaudeMd(agent, delegations, agents)
    fs.writeFileSync(filePath, content)

    res.json({ ok: true, file: filePath })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Surgically update only the ## Delegation section in each agent's .md file.
// Preserves all other content (Role, Responsibilities, Goals, custom sections).
router.post('/sync-delegations', (req: Request, res: Response) => {
  try {
    const chart: OrgChart = req.body
    const agentsDir = path.join(expandHome(chart.outputDirectory), 'agents')

    if (!fs.existsSync(agentsDir)) {
      return res.status(404).json({ error: `No agents/ folder at ${agentsDir}` })
    }

    const written: string[] = []
    for (const agent of chart.agents) {
      const filePath = path.join(agentsDir, `${agent.name}.md`)
      if (!fs.existsSync(filePath)) continue

      const original = fs.readFileSync(filePath, 'utf-8')
      const updated = replaceDelegationSection(
        original,
        buildDelegationSection(agent, chart.delegations, chart.agents)
      )

      if (updated !== original) {
        fs.writeFileSync(filePath, updated)
        written.push(filePath)
      }
    }

    res.json({ ok: true, files: written, count: written.length })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Reads agents from disk and merges them with the saved chart.
// - Agents on disk are the source of truth for content fields.
// - Saved positions are preserved by matching on agent.name.
// - Canvas-only agents (not yet on disk) are kept as-is.
function mergeWithDisk(chart: OrgChart): OrgChart {
  const dir = chart.outputDirectory ? expandHome(chart.outputDirectory) : ''
  const agentsDir = dir ? path.join(dir, 'agents') : ''

  if (!agentsDir || !fs.existsSync(agentsDir)) {
    return chart
  }

  const savedByName = new Map(chart.agents.map((a) => [a.name, a]))
  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'))

  const fromDisk: Agent[] = files.map((file, idx) => {
    const name = file.replace(/\.md$/, '')
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf-8')
    const parsed = parseAgentMd(content, name, idx)
    const saved = savedByName.get(name)
    if (saved) {
      parsed.id = saved.id
      parsed.position = saved.position
    }
    return parsed
  })

  const onDiskNames = new Set(fromDisk.map((a) => a.name))
  const canvasOnly = chart.agents.filter((a) => !onDiskNames.has(a.name))

  // Drop delegations that reference agents no longer present
  const allIds = new Set([...fromDisk.map((a) => a.id), ...canvasOnly.map((a) => a.id)])
  const validDelegations = chart.delegations.filter(
    (d) => allIds.has(d.from) && allIds.has(d.to)
  )

  return {
    ...chart,
    agents: [...fromDisk, ...canvasOnly],
    delegations: validDelegations,
  }
}
