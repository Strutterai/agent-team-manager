import express from 'express'
import cors from 'cors'
import { router as filesRouter } from './routes/files.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
app.use('/api', filesRouter)

app.listen(PORT, () => {
  console.log(`Agent Team Manager server running on http://localhost:${PORT}`)
})
