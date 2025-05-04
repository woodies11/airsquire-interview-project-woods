export const NavHeader = ({ children }: { children?: React.ReactNode }) => {
  return (
    <nav className="bg-slate-900 text-white shadow-md min-h-12 w-full relative flex justify-center items-center ">
      {children}
    </nav>
  )
}
