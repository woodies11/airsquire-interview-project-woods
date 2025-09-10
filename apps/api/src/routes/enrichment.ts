import express from 'express'
import fileUpload from 'express-fileupload'
import fs from 'fs'
import { ObjectId } from 'mongodb'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs'
import path from 'path'
import sharp from 'sharp'
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

const IMAGE_COMPARE_PROMPT = `
This will be used for an MVP feature to showcase the *potential* of AI in construction.
Hence, use confidence languages. Information will not actually be used so minor inaccuracies are acceptable.

You are a project manager overseeing a construction project. Your will be sent a set of paranomic 360 degree images of the construction site taken at some interval apart.

As the project manager overseeing the construction team, you want to create a progress report to be sent to stakeholders, summarizing and highlighting what your team has done and the progress accomplished thus far.
Keep this in mind and use the appropriate tone and point of interest when crafting your report.

**Your main task is to:**

Start off with a high-level summary of the overall progress of the construction site.

1. Analyze each images and make sure they are all from the same construction site and spot
2. Identify any changes or progress in the construction site between the images
3. Generate a report summarizing your findings, specifically what have been done between each images
4. DO NOT make up any information. If you are not sure, imply say so.
5. Reply in Markdown format, with proper headings and sections.
6. Be clear and concise, keep things as short as possible.
7. Refer to the first image as "Left Image" and the second image as "Right Image" in your report.

**IMPORTANT**: Do not include any placeholder, recommended next steps, or remark/hesitation in the report. This is a tech showcase, so sound confident.
`

const router = express.Router()

router.use(
  fileUpload({
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: 'tmp/',
  })
)

router.post('/compare', async (req: any, res: any) => {
  const { imgA, imgB } = req.files

  if (!imgA || !imgB) {
    return res.status(400).json({ error: 'Two images are required' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  res.write('%%SYSTEM%%: Starting image comparison...$$\n')

  const bufferA = fs.readFileSync(imgA.tempFilePath)
  const bufferB = fs.readFileSync(imgB.tempFilePath)

  // convert to base64 strings with proper prefix
  const base64imgA = `data:${imgA.mimetype};base64,${bufferA.toString('base64')}`
  const base64imgB = `data:${imgB.mimetype};base64,${bufferB.toString('base64')}`

  if (!base64imgA || !base64imgB) {
    return res.status(400).json({ error: 'Failed to convert images to base64' })
  }

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: [{ type: 'text', text: IMAGE_COMPARE_PROMPT }],
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: base64imgA },
        },
        {
          type: 'image_url',
          image_url: { url: base64imgB },
        },
      ],
    },
  ]

  try {
    console.log('Starting image comparison stream...')
    for await (const chunk of compareImages(messages)) {
      res.write(`%%DATA%%:${chunk}$$`)
    }
    res.end()
  } catch (err) {
    console.error('Streaming error:', err)
    res.write('%%ERROR%%: error\ndata: Error during OpenAI stream$$\n')
    res.end()
  }
})

async function* compareImages(messages: ChatCompletionMessageParam[]) {
  const responseStream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    stream: true,
  })
  console.log('received responseStream...')

  for await (const chunk of responseStream) {
    const content = chunk.choices?.[0]?.delta?.content
    if (content) yield content
  }
}

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

  // Limit image size to speed up AI processing
  const imageBuffer = await sharp(fileData)
    .resize({ height: 1920, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

  const base64 = imageBuffer.toString('base64')
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
  console.log('received responseStream...')

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
  console.log('received responseStream...')

  for await (const chunk of responseStream) {
    const content = chunk.choices?.[0]?.delta?.content
    if (content) yield content
  }
}

export default router
