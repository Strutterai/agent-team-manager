import { test, expect, Page, APIRequestContext } from '@playwright/test'
import path from 'path'

const CANVAS_SCREENSHOT = path.join(process.cwd(), 'docs', 'screenshot.png')
const EDIT_SCREENSHOT = path.join(process.cwd(), 'docs', 'screenshot-edit.png')
const SOCIAL_PREVIEW = path.join(process.cwd(), 'docs', 'social-preview.png')
const DEMO_DIR = path.join(process.cwd(), '.claude')
const API = 'http://localhost:3001'

// Hierarchical positions for the 5 demo agents. Centered roughly around
// x=600 so the team fits a 1600px viewport.
const POSITIONS: Record<string, { x: number; y: number }> = {
  'lead-agent':      { x: 580, y: 0 },
  'architect-agent': { x: 180, y: 260 },
  'code-agent':      { x: 580, y: 260 },
  'docs-agent':      { x: 980, y: 260 },
  'review-agent':    { x: 580, y: 520 },
}

// Delegation edges with human reasons, keyed by source/target agent name.
const DELEGATIONS: Array<{ from: string; to: string; reason: string }> = [
  { from: 'lead-agent',      to: 'architect-agent', reason: 'Plan a new feature first' },
  { from: 'lead-agent',      to: 'code-agent',      reason: 'General implementation' },
  { from: 'lead-agent',      to: 'docs-agent',      reason: 'Write documentation' },
  { from: 'architect-agent', to: 'code-agent',      reason: 'Execute the plan' },
  { from: 'code-agent',      to: 'review-agent',    reason: 'PR review before merge' },
  { from: 'review-agent',    to: 'docs-agent',      reason: 'Release notes for approved PR' },
]

// Build the demo canvas state: read agents from disk, apply nice positions,
// add demo delegations. Reload the page so React Flow renders edges + nodes
// in their final positions.
async function setupDemoCanvas(page: Page, request: APIRequestContext) {
  // Reset whatever local state exists
  await request.post(`${API}/api/chart`, {
    data: { outputDirectory: DEMO_DIR, agents: [], delegations: [] },
  })

  // Have the server read the demo agents from disk into the chart
  const reloadRes = await request.post(`${API}/api/reload`, {
    data: { outputDirectory: DEMO_DIR },
  })
  const chart = await reloadRes.json()

  // Apply nice positions
  for (const agent of chart.agents) {
    if (POSITIONS[agent.name]) {
      agent.position = POSITIONS[agent.name]
    }
  }

  // Wire up demo delegations
  const idByName: Record<string, string> = {}
  for (const a of chart.agents) idByName[a.name] = a.id

  chart.delegations = DELEGATIONS.map((d, i) => ({
    id: `demo-${i}`,
    from: idByName[d.from],
    to: idByName[d.to],
    reason: d.reason,
  })).filter((d) => d.from && d.to)

  // Persist
  await request.post(`${API}/api/chart`, { data: chart })

  // Load the page fresh so it pulls the new chart state
  await page.goto('/')
  await page.waitForTimeout(2000)
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.react-flow__edge').first()).toBeVisible({ timeout: 5_000 })
}

test('main canvas screenshot', async ({ page, request }) => {
  await setupDemoCanvas(page, request)

  await page.locator('.react-flow__controls-fitview').click()
  await page.waitForTimeout(800)

  await page.screenshot({
    path: CANVAS_SCREENSHOT,
    fullPage: false,
    animations: 'disabled',
  })

  const fs = await import('fs')
  expect(fs.statSync(CANVAS_SCREENSHOT).size).toBeGreaterThan(10_000)
})

test('social preview image (1280x640)', async ({ page, request }) => {
  // GitHub social preview is 1280x640. Twitter/LinkedIn pull this for
  // link previews. Bigger, cleaner framing than the README screenshot.
  await page.setViewportSize({ width: 1280, height: 640 })
  await setupDemoCanvas(page, request)

  await page.locator('.react-flow__controls-fitview').click()
  await page.waitForTimeout(800)

  await page.screenshot({
    path: SOCIAL_PREVIEW,
    fullPage: false,
    animations: 'disabled',
    clip: { x: 0, y: 0, width: 1280, height: 640 },
  })

  const fs = await import('fs')
  expect(fs.statSync(SOCIAL_PREVIEW).size).toBeGreaterThan(10_000)
})

test('edit panel screenshot', async ({ page, request }) => {
  await setupDemoCanvas(page, request)

  // Frame the team first so the panel screenshot has context
  await page.locator('.react-flow__controls-fitview').click()
  await page.waitForTimeout(800)

  // Click the Code Agent card. Code Agent is central in the org chart
  // and has both incoming and outgoing delegations, so the panel shows
  // both Reports to and Delegates to.
  await page.getByText('Code Agent', { exact: true }).first().click()
  await expect(page.getByText('AGENT CONFIG')).toBeVisible({ timeout: 5_000 })
  await page.waitForTimeout(500)

  await page.screenshot({
    path: EDIT_SCREENSHOT,
    fullPage: false,
    animations: 'disabled',
  })

  const fs = await import('fs')
  expect(fs.statSync(EDIT_SCREENSHOT).size).toBeGreaterThan(10_000)
})
