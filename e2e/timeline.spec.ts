import { test, expect } from '@playwright/test'
import path from 'path'

const TIMELINE_SHOT = path.join(process.cwd(), 'docs', 'screenshot-timeline.png')

test('session replay timeline renders', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1500)

  await page.getByRole('tab', { name: 'Session Replay' }).click()
  await page.waitForTimeout(500)

  // Pick the most recent session that has a real title (skip the live one
  // whose title is still the UUID).
  const sel = page.locator('select')
  const options = await sel.locator('option').all()
  for (const opt of options) {
    const text = (await opt.textContent()) || ''
    if (/process visualization/i.test(text)) {
      await sel.selectOption({ label: text })
      break
    }
  }
  await page.waitForTimeout(1500)

  // Sanity: at least one event marker rendered
  await expect(page.locator('svg circle, svg polygon, svg rect').first()).toBeVisible()

  await page.screenshot({ path: TIMELINE_SHOT, animations: 'disabled' })
})
