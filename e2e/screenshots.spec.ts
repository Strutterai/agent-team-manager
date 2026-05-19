import { test, expect, Page, APIRequestContext } from '@playwright/test'
import path from 'path'

const CANVAS_SCREENSHOT = path.join(process.cwd(), 'docs', 'screenshot.png')
const EDIT_SCREENSHOT = path.join(process.cwd(), 'docs', 'screenshot-edit.png')
const DEMO_DIR = path.join(process.cwd(), '.claude')

// Reset the canvas state and point the tool at the repo's demo agents
// so screenshots are deterministic regardless of local org-chart.json.
async function setupDemoCanvas(page: Page, request: APIRequestContext) {
  await request.post('http://localhost:3001/api/chart', {
    data: { outputDirectory: DEMO_DIR, agents: [], delegations: [] },
  })

  await page.goto('/')

  const dirInput = page.getByPlaceholder('~/.claude')
  await expect(dirInput).toBeVisible({ timeout: 10_000 })
  await dirInput.fill(DEMO_DIR)

  // Wait for the debounced reload + nodes to render
  await page.waitForTimeout(2000)
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15_000 })
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

test('edit panel screenshot', async ({ page, request }) => {
  await setupDemoCanvas(page, request)

  // Click the Code Agent card to open the edit panel. Use exact-text
  // matching on the title heading so we don't accidentally click a
  // different node whose body text mentions "Code Agent".
  await page.getByText('Code Agent', { exact: true }).first().click()

  // Wait for the panel to mount and the AGENT CONFIG header to be visible
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
