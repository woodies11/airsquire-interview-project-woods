import Link from 'next/link'
import { NavHeader } from '../../components/ui/NavHeader/NavHeader'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavHeader>
        <span>
          <Link href="/">Airsquire</Link>
        </span>
      </NavHeader>
      <main>{children}</main>
    </>
  )
}
