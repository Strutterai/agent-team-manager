import { Router, Request, Response } from 'express'
import { listSessions, parseSession } from '../lib/session-log.js'

export const router = Router()

router.get('/sessions', (req: Request, res: Response) => {
  try {
    const projectPath =
      typeof req.query.projectPath === 'string' && req.query.projectPath
        ? req.query.projectPath
        : process.cwd()
    const sessions = listSessions(projectPath)
    res.json({ ok: true, projectPath, sessions })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const projectPath =
      typeof req.query.projectPath === 'string' && req.query.projectPath
        ? req.query.projectPath
        : process.cwd()
    const replay = await parseSession(projectPath, req.params.sessionId)
    res.json({ ok: true, ...replay })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})
