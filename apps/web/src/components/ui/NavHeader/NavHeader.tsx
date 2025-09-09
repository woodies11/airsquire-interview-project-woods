import Link from 'next/link'

export default function NavHeader() {
  return (
    <nav className="bg-asq-primary text-white min-h-14 w-full relative grid grid-cols-3 justify-center items-center">
      <div className="flex items-center justify-start pl-4">
        <Link href="/" className="flex items-center">
          <h1 className="text-2xl font-medium">Airsquire</h1>
        </Link>
      </div>
      <div className="flex items-center justify-center"></div>
      <div className="flex items-center justify-end pr-4 gap-4">
        <Link href="/" className="text-md font-medium hover:text-asq-accent">
          Home
        </Link>
        <Link href="/statistics" className="text-md font-medium hover:text-asq-accent">
          Statistics
        </Link>
        <Link href="/upload" className="text-md font-medium hover:text-asq-accent">
          Upload
        </Link>
        <Link
          href="/analysis"
          className="text-lg font-medium hover:text-asq-accent px-4 py-1 bg-asq-accent rounded-full text-asq-foreground-light duration-500 hover:bg-asq-accent-secondary"
        >
          AI Analysis
        </Link>
      </div>
    </nav>
  )
}
