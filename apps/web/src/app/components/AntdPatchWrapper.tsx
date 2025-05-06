'use client'

// Not sure what this patch includes so adding it to client side just to be safe
import '@ant-design/v5-patch-for-react-19'

export default function AntdPatchWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
