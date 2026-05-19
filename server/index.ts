import express from 'express'
import cors from 'cors'
import { router as filesRouter } from './routes/files.js'

const app = express()
const PORT = 3001

// Restrict CORS to the local Vite dev server only.
// Without this, any website you visit could POST to localhost:3001
// and read/write arbitrary files on your machine through the filesystem API.
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  })
)

// Bind to loopback only so the server is never exposed on the network.
app.use(express.json({ limit: '10mb' }))
app.use('/api', filesRouter)

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Agent Team Manager server running on http://localhost:${PORT}`)
})
