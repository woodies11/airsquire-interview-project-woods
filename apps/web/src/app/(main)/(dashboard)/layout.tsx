import Link from 'next/link'
import { NavHeader } from '../../../components/ui/NavHeader/NavHeader'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main>{children}</main>
    </>
  )
}
