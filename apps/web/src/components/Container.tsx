export const Container = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div className={`w-full mx-auto ${className} px-2 max-w-full md:max-w-6xl`}>{children}</div>
  )
}
