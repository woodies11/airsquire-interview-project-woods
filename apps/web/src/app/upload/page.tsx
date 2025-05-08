'use client'

import { useCallback, useEffect, useState } from 'react'
import { Form, Input, Button, Upload, DatePicker, Rate, message, Switch, Select, Tag } from 'antd'
import type { GetProp, UploadFile, UploadProps } from 'antd'
import { Container } from '@web/components/Container'
import PanoramicViewer from '@web/components/ui/PanoramicViewer/PanoramicViewer'
import { Skeleton } from 'antd'

import { PlusOutlined } from '@ant-design/icons'
import imageCompression from 'browser-image-compression'
import { useUpload } from '@web/components/BackgroundUploadOverlay/BackgroundUploadProvider'
import { useRouter } from 'next/navigation'
import { BASE_API_URL } from 'apps/web/configs'

const fileEventHandler = (e: any) => {
  if (Array.isArray(e)) {
    return e
  }
  return e?.fileList
}

export default function UploadPage() {
  const [form] = Form.useForm()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadId, setUploadId] = useState('')
  const [hasSelectedImage, setHasSelectedImage] = useState(false)

  const [previewImage, setPreviewImage] = useState('')
  const [aiDescription, setAiDescription] = useState('')
  const [aiTags, setAiTags] = useState<string[]>([])
  const [aiTagsDisplay, setAiTagsDisplay] = useState<string[]>([])

  const { startBackgroundUpload, pendingUploads } = useUpload()

  const router = useRouter()

  const handleTagClick = useCallback(
    tag => {
      const tags = form.getFieldValue('tags') || []
      const newTags = [...tags, tag]
      form.setFieldsValue({ tags: newTags })
      setAiTagsDisplay(prev => prev.filter(t => t !== tag))
    },
    [setAiTagsDisplay, form]
  )

  useEffect(() => {
    if (aiTags.length > 0) {
      const tags = form.getFieldValue('tags') || []
      const newTags = aiTags.filter(tag => !tags.includes(tag))
      setAiTagsDisplay([...newTags])
    }
  }, [aiTags])

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
      setAiTagsDisplay([])
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
              // Needed to catch edges cases where the user change the image while having taqs populated
              const tags = form.getFieldValue('tags') || []
              const newTags = [...tags, ...parsedJson.a]
              setAiTags(newTags)
            }
            continue
          }
        }
      }
    }

    enrichData()

    return () => {
      isSubscribed = false
    }
  }, [uploadId])

  const toSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  const uploadSmallerSize = async (file: File, sha256: string) => {
    const options = {
      maxHeight: 1920,
      useWebWorker: true,
      maxSizeMB: 5,
    }

    const compressedFile = await imageCompression(file, options)

    const formData = new FormData()
    formData.append('file', compressedFile, file.name)
    formData.append('sha256', sha256)

    return fetch(`${BASE_API_URL}/api/images`, {
      method: 'POST',
      body: formData,
    })
  }

  const beforeUpload = async (file: File) => {
    setUploadId('')
    setIsUploading(true)
    setHasSelectedImage(true)
    return true
  }

  const handleChange = info => {
    if (info.file.status === 'done') {
      const { id } = info.file.response
      setUploadId(id)
    }
  }

  const customRequest: UploadProps['customRequest'] = async ({ file, onSuccess }) => {
    const f = file as File // Technically RcFile but File is a subset of RcFile
    const sha256 = await toSHA256(f)

    // Upload a smaller version first to kick start enrichment process and get database entry
    const res = await uploadSmallerSize(f, sha256)
    const data = await res.json()
    if (data.success) {
      setUploadId(data.id)
    }

    // The above request require image compression, so we should delay the loading three.js viewer
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewImage(reader.result as string)
    }
    reader.readAsDataURL(f)

    onSuccess(data, file)

    // Once that is done, allow user to submit the form while orginal image is uploading in the background
    setIsUploading(false)

    // Most panoramic images are large, so this will take a long while
    startBackgroundUpload(f, {
      sha256,
      id: data.id,
    })
  }

  const handleSubmit = async (data: any) => {
    if (!uploadId) {
      message.info('Uploading...')
      return
    }
    const { files, ...formData } = data

    const res = await fetch(`${BASE_API_URL}/api/images`, {
      method: 'PATCH',
      body: JSON.stringify({
        id: uploadId,
        ...formData,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const payload = await res.json()
    if (payload.success) {
      if (pendingUploads > 0) {
        message.success(
          'Successfully added new image, full resolution image will continue uploading in the background.'
        )
      }
      // Don't want the back button to take the user back to the upload page
      router.replace(`/`)
    } else {
      message.error('Error uploading image')
    }
  }

  return (
    <div className="w-full min-h-[calc(100vh+20rem)] flex flex-col items-center">
      {hasSelectedImage && (
        <Container className="mt-8">
          <PanoramicViewer imgSrc={previewImage} />
        </Container>
      )}
      <div className="w-full p-4 max-w-2xl mx-auto mt-2">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isBookmarked: false }}
          onFinish={handleSubmit}
          className="flex flex-col gap-4"
        >
          <Form.Item
            label={null}
            name="files"
            valuePropName="fileList"
            getValueFromEvent={fileEventHandler}
            rules={[{ required: true, message: 'Please upload a panoramic image' }]}
          >
            <Upload
              action={`http://localhost:4000/api/images/original`}
              accept="image/*"
              maxCount={1}
              showUploadList={false}
              onChange={handleChange}
              beforeUpload={beforeUpload}
              customRequest={customRequest}
              className="w-full flex flex-col items-center justify-center"
            >
              {!hasSelectedImage && (
                <div className="bg-gray-100 cursor-pointer flex flex-col items-center justify-center max-w-screen w-xl h-64 border border-dashed rounded-lg p-4 mb-8 border-gray-500">
                  <p>Click or drag file to this area to upload</p>
                </div>
              )}
              {hasSelectedImage && <Button disabled={isUploading}>Change Image</Button>}
            </Upload>
          </Form.Item>

          <Form.Item label="Name" name="name" rules={[{ required: true }]} className="my-0 p-0">
            <Input />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          {uploadId && !aiDescription && <Skeleton active />}
          {aiDescription && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold">AI Description:</h2>
              <p>{aiDescription}</p>
            </div>
          )}
          <Form.Item label="Tags" name="tags">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Tags"
              onChange={() => {
                const tags = form.getFieldValue('tags') || []
                setAiTagsDisplay(() => {
                  return aiTags.filter(tag => !tags.includes(tag))
                })
              }}
            />
          </Form.Item>
          {uploadId && !aiTags?.length && <Skeleton.Input active block />}
          {aiTagsDisplay.length > 0 && (
            <div className="flex gap-2 flex-wrap w-full mb-8 items-center">
              <span className="font-bold">AI Suggested Tags:</span>
              {aiTagsDisplay.map((tag, index) => (
                <Tag
                  key={index}
                  closeIcon={<PlusOutlined />}
                  onClose={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleTagClick(tag)
                  }}
                  className="cursor-pointer"
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </Tag>
              ))}
            </div>
          )}
          <div className="flex w-full gap-4 justify-between">
            <Form.Item label="Bookmark" valuePropName="checked" name="isBookmarked">
              <Switch />
            </Form.Item>
          </div>
          <Form.Item label={null}>
            <Button type="primary" htmlType="submit" loading={isUploading} disabled={isUploading}>
              Upload
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
