import express from 'express'
import OpenAI from 'openai'

const router = express.Router()

router.post('/ask', async (req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

export default router
