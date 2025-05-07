'use client'

import { useEffect, useState } from 'react'
import { Form, Input, Button, Upload, DatePicker, Rate, message, Switch, Select, Tag } from 'antd'
import type { GetProp, UploadFile, UploadProps } from 'antd'
import { Container } from '@web/components/Container'
import PanoramicViewer from '@web/components/ui/PanoramicViewer/PanoramicViewer'

import { PlusOutlined } from '@ant-design/icons'

const BASE_API_URL = process.env.NEXT_PUBLIC_BASE_API_URL || 'http://localhost:4000'

const fileEventHandler = (e: any) => {
  if (Array.isArray(e)) {
    return e
  }
  return e?.fileList
}

export default function UploadPage() {
  const [form] = Form.useForm()
  const [uploading, setUploading] = useState(false)
  const [uploadId, setUploadId] = useState('')

  const [previewImage, setPreviewImage] = useState('')
  const [aiDescription, setAiDescription] = useState('')
  const [aiTags, setAiTags] = useState<string[]>([])
  const [aiLocation, setAiLocation] = useState('')
  const [aiTimeOfDay, setAiTimeOfDay] = useState('')
  const [aiSuggestedName, setAiSuggestedName] = useState('')

  useEffect(() => {
    let isSubscribed = false
    if (!uploadId)
      return () => {
        isSubscribed = false
      }

    const enrichData = async () => {
      isSubscribed = true

      // clear previous data
      setAiDescription('')
      setAiTags([])
      setAiLocation('')
      setAiTimeOfDay('')
      setAiSuggestedName('')
      setAiDescription('')

      const res = await fetch(`${BASE_API_URL}/api/enrichment`, {
        method: 'POST',
        body: JSON.stringify({
          imageId: uploadId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!isSubscribed) break

        const lines = decoder.decode(value).split('\n')

        for (const line of lines) {
          if (line.startsWith('%%DESC%%:')) {
            const desc = line.replace('%%DESC%%:', '')
            if (isSubscribed) {
              setAiDescription(prev => {
                return (prev += desc)
              })
            }
            continue
          } else if (line.startsWith('%%JSON%%:')) {
            const json = line.replace('%%JSON%%:', '').trim()
            const parsedJson = JSON.parse(json)
            if (isSubscribed) {
              setAiDescription(parsedJson.d)
              setAiTags(parsedJson.a)
              setAiLocation(parsedJson.l)
              setAiTimeOfDay(parsedJson.t)
              setAiSuggestedName(parsedJson.n)
            }
            console.log('parsedJson', parsedJson)
            continue
          } else {
            console.log(line)
          }
        }
      }
    }

    enrichData()

    return () => {
      isSubscribed = false
    }
  }, [uploadId])

  const beforeUpload = async (file: File) => {
    const reader = new FileReader()

    reader.onload = () => {
      setPreviewImage(reader.result as string)
    }

    reader.readAsDataURL(file)

    return true
  }

  const handleChange = info => {
    console.log('info', info)
    if (info.file.status === 'uploading') {
      setUploadId('')
      setUploading(true)
    } else {
      setUploading(false)
    }
    if (info.file.status === 'done') {
      const { id } = info.file.response
      setUploadId(id)
    }
  }

  const handleUpload = async (data: any) => {
    if (!uploadId) {
      message.info('Uploading...')
      return
    }
    const { files, ...formData } = data

    const result = await fetch(`${BASE_API_URL}/api/images`, {
      method: 'PATCH',
      body: JSON.stringify({
        id: uploadId,
        ...formData,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const res = await result.json()
    console.log('res', res)
  }

  return (
    <div className="w-full min-h-[calc(100vh+20rem)] flex flex-col items-center">
      {previewImage && (
        <Container className="mt-8">
          <PanoramicViewer imgSrc={previewImage} />
        </Container>
      )}
      <div className="w-full p-4 max-w-2xl mx-auto mt-2">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isBookmarked: false }}
          onFinish={handleUpload}
        >
          <Form.Item
            label={null}
            name="files"
            valuePropName="fileList"
            getValueFromEvent={fileEventHandler}
            rules={[{ required: true, message: 'Please upload a panoramic image' }]}
          >
            <Upload
              action={`http://localhost:4000/api/images`}
              accept="image/*"
              maxCount={1}
              showUploadList={false}
              onChange={handleChange}
              beforeUpload={beforeUpload}
              className="w-full flex flex-col items-center justify-center"
            >
              {!previewImage && (
                <div className="bg-gray-100 cursor-pointer flex flex-col items-center justify-center max-w-screen w-xl h-64 border border-dashed rounded-lg p-4 mb-8 border-gray-500">
                  <p>Click or drag file to this area to upload</p>
                </div>
              )}
              {previewImage && <Button>Change Image</Button>}
            </Upload>
          </Form.Item>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {aiSuggestedName && (
            <div className="my-8">
              <h2 className="text-lg font-semibold">AI Suggested Name:</h2>
              <p>{aiSuggestedName}</p>
            </div>
          )}
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          {aiDescription && (
            <div className="my-8">
              <h2 className="text-lg font-semibold">AI Description:</h2>
              <p>{aiDescription}</p>
            </div>
          )}
          <Form.Item label="Tags" name="tags">
            <Select mode="tags" style={{ width: '100%' }} placeholder="Tags" />
          </Form.Item>
          {aiTags.length > 0 && (
            <>
              <h2>AI Suggested Tags:</h2>
              {aiTags.map((tag, index) => (
                <Tag
                  key={index}
                  closeIcon={<PlusOutlined />}
                  onClose={e => {
                    e.preventDefault()
                  }}
                  className="cursor-pointer"
                  onClick={() => {
                    const tags = form.getFieldValue('tags') || []
                    const newTags = [...tags, tag]
                    form.setFieldsValue({ tags: newTags })
                    setAiTags(prev => prev.filter(t => t !== tag))
                  }}
                >
                  {tag}
                </Tag>
              ))}
            </>
          )}
          <div className="flex w-full gap-4 justify-between">
            <Form.Item label="Bookmark" valuePropName="checked" name="isBookmarked">
              <Switch />
            </Form.Item>
            <Form.Item label="Date" name="date">
              <DatePicker />
            </Form.Item>
            <Form.Item label="Rating" name="rating">
              <Rate />
            </Form.Item>
          </div>
          <Form.Item label={null}>
            <Button type="primary" htmlType="submit" loading={uploading} disabled={uploading}>
              Upload
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
