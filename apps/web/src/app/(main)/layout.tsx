import NavHeader from '@web/components/ui/NavHeader/NavHeader'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavHeader />
      <main>{children}</main>
    </>
  )
}
