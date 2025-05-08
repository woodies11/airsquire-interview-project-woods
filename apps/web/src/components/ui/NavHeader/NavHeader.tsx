export const NavHeader = ({ children }: { children?: React.ReactNode }) => {
  return (
    <nav className="bg-asq-primary text-white min-h-14 w-full relative flex justify-center items-center">
      {children}
    </nav>
  )
}
