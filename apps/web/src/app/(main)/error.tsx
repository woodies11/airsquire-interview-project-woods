'use client'

import { Container } from '@web/components/ui/Container'

export default function ErrorPage() {
  return (
    <Container>
      <div className="flex flex-col items-center justify-center w-full h-full py-8 text-asq-foreground-light">
        <h1 className="text-4xl font-bold mb-8">Error</h1>
        <p>Something went wrong.</p>
      </div>
    </Container>
  )
}
