'use client'

import { useState } from 'react'
import { Form, Input, Button, Upload, DatePicker, Rate, message, Switch } from 'antd'
import type { GetProp, UploadFile, UploadProps } from 'antd'
import { Container } from '@web/components/Container'
import PanoramicViewer from '@web/components/ui/PanoramicViewer/PanoramicViewer'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000'

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
    if (info.file.status === 'done') {
      console.log('info.file.response', info.file.response)
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

    const result = await fetch(`${BASE_URL}/api/uploads`, {
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

    // try {
    //   const formData = new FormData()
    //   formData.append('file', file as Blob)
    //   formData.append('name', form.getFieldValue('name') || '')
    //   formData.append('description', form.getFieldValue('description') || '')
    //   formData.append('tags', form.getFieldValue('tags') || '')

    //   setUploading(true)

    //   const res = await fetch('/api/upload', {
    //     method: 'POST',
    //     body: formData,
    //   })

    //   const result = await res.json()

    //   if (res.ok) {
    //     message.success('Upload successful')
    //     onSuccess?.(result, new XMLHttpRequest())
    //     form.resetFields()
    //   } else {
    //     message.error(result.error || 'Upload failed')
    //     onError?.(new Error(result.error || 'Upload failed'))
    //   }
    // } catch (err) {
    //   message.error('Unexpected error')
    //   onError?.(err as Error)
    // } finally {
    //   setUploading(false)
    // }
  }

  return (
    <>
      {previewImage && (
        <Container className="mt-8">
          <PanoramicViewer imgSrc={previewImage} />
        </Container>
      )}
      <div className="w-full p-4 max-w-2xl mx-auto">
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
              action={`http://localhost:4000/api/uploads`}
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
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
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
            <Button type="primary" htmlType="submit">
              Upload
            </Button>
          </Form.Item>
        </Form>
      </div>
    </>
  )
}
