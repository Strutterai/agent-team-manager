import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOT_PATH = path.join(process.cwd(), 'docs', 'screenshot.png')
const DEMO_DIR = path.join(process.cwd(), '.claude')

test('captures the canvas with demo agents', async ({ page, request }) => {
  // Reset any saved canvas state so the screenshot only reflects the demo
  // agents on disk. Otherwise leftover org-chart.json content from local
  // dev would pollute the image.
  await request.post('http://localhost:3001/api/chart', {
    data: { outputDirectory: DEMO_DIR, agents: [], delegations: [] },
  })

  await page.goto('/')

  const dirInput = page.getByPlaceholder('~/.claude')
  await expect(dirInput).toBeVisible({ timeout: 10_000 })
  await dirInput.fill(DEMO_DIR)

  // Wait for the debounced reload (600ms) + agent nodes to render
  await page.waitForTimeout(2000)
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15_000 })

  // Frame the whole graph
  await page.locator('.react-flow__controls-fitview').click()
  await page.waitForTimeout(800)

  // Capture the canvas in its final state
  await page.screenshot({
    path: SCREENSHOT_PATH,
    fullPage: false,
    animations: 'disabled',
  })

  // Sanity check: file was written and has reasonable size
  const fs = await import('fs')
  const stats = fs.statSync(SCREENSHOT_PATH)
  expect(stats.size).toBeGreaterThan(10_000) // > 10 KB
})
