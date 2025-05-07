import express from 'express'
import fs from 'fs'
import { ObjectId } from 'mongodb'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs'
import path from 'path'
import { z } from 'zod'
import { dbImagesCollection } from '../db.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const IMAGE_ENRICHMENT_PROMPT_STEP_1 = `
You are an AI assistant that helps users enrich their images with metadata. You will be given an image in base64 format and your task is to:
1. Describe the image in detail, including objects, people, and actions.
2. Do not make up any information in desription. If you cannot identify something simply say so.
Only return plain text, no markdown or other formatting.
`

const IMAGE_ENRICHMENT_PROMPT_STEP_2 = `
Now, based on the description you provided, identify and generate:
1. Suggested name for the image.
2. The location of the image (e.g., city, country, or specific place) or "unknown" if you cannot identify it.
3. The time of day the image was taken (daytime, night-time, or unknown).
4. A list of tags for the image for metadata enrichment and searchability purposes.

Return the location, time of day, and tags in a JSON format as follows:
{
  "n": "<name>",
  "l": "<location>",
  "t": "<time_of_day>",
  "a": ["<tag1>", "<tag2>", ...]
}
Do not include any other information or explanations in the response.
Do not make up any information in the response. If you cannot identify something simply say so.
`

const router = express.Router()

router.post('/', async (req: any, res: any) => {
  const { imageId } = req.body
  if (!imageId) {
    return res.status(400).json({ error: 'No imageId provided' })
  }
  const image = await dbImagesCollection.findOne({ _id: new ObjectId(imageId) })
  if (!image) {
    return res.status(404).json({ error: 'Image not found' })
  }
  const { imageUrl } = image

  const fileData = fs.readFileSync(imageUrl)
  const base64 = fileData.toString('base64')
  const ext = path.extname(imageUrl).substring(1)
  const mime = ext === 'jpg' ? 'jpeg' : ext // base64 encoding for jpg is 'jpeg'
  const base64Image = `data:image/${mime};base64,${base64}`

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: [{ type: 'text', text: IMAGE_ENRICHMENT_PROMPT_STEP_1 }],
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: base64Image },
        },
      ],
    },
  ]

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  let description = ''

  try {
    console.log('Starting image description stream...')
    for await (const chunk of describeImage(messages)) {
      description += chunk
      res.write(`%%DESC%%:${chunk}\n\n`)
    }
    res.write('%%SYSTEM%%: [DONE] Waiting for JSON...\n\n')
  } catch (err) {
    console.error('Streaming error:', err)
    res.write('%%event%%: error\ndata: Error during OpenAI stream\n\n')
    res.end()
  }

  messages.push({
    role: 'assistant',
    content: [{ type: 'text', text: description }],
  })
  messages.push({
    role: 'user',
    content: [
      {
        type: 'text',
        text: IMAGE_ENRICHMENT_PROMPT_STEP_2,
      },
    ],
  })

  let enrichmentResponse = {}

  try {
    console.log('Starting JSON generation stream...')
    let jsonBuffer = ''
    for await (const chunk of generateEnrichmentJSON(messages)) {
      jsonBuffer += chunk
      res.write(`%%DATA%%:${chunk}\n\n`)
    }
    const completedJSON = JSON.parse(jsonBuffer)
    enrichmentResponse = {
      d: description,
      ...completedJSON,
    }
    res.write(`%%JSON%%:${JSON.stringify(enrichmentResponse)}\n\n`)
    res.end()
  } catch (err) {
    console.error('Streaming error:', err)
    res.write('%%event%%: error\ndata: Error during OpenAI stream\n\n')
    res.end()
  }

  // Save the latest enrichment response to the database for use in searching
  dbImagesCollection.updateOne(
    { _id: new ObjectId(imageId) },
    {
      $set: {
        aiEnrichment: {
          ...enrichmentResponse,
          dateEnriched: new Date(),
          model: 'gpt-4o-mini-2024-07-18',
        },
      },
    }
  )
})

const EnrichmentResponse = zodResponseFormat(
  z.object({
    n: z.string(),
    l: z.string().nullable(),
    t: z.enum(['daytime', 'night-time', 'unknown']),
    a: z.array(z.string()),
  }),
  'image_enrichment_response'
)

async function* describeImage(messages: ChatCompletionMessageParam[]) {
  const responseStream = await openai.chat.completions.create({
    model: 'gpt-4o-mini-2024-07-18',
    messages: messages,
    temperature: 0.3,
    stream: true,
  })

  for await (const chunk of responseStream) {
    const content = chunk.choices?.[0]?.delta?.content
    if (content) yield content
  }
}

async function* generateEnrichmentJSON(messages: ChatCompletionMessageParam[]) {
  const responseStream = await openai.chat.completions.create({
    model: 'gpt-4o-mini-2024-07-18',
    messages: messages,
    temperature: 0.3,
    response_format: EnrichmentResponse,
    stream: true,
  })

  for await (const chunk of responseStream) {
    const content = chunk.choices?.[0]?.delta?.content
    if (content) yield content
  }
}

export default router
