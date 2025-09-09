import FloatingAIPaneContextProvider from '@web/components/FloatingAIPane/FloatingAIPaneContextProvider'

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return <FloatingAIPaneContextProvider>{children}</FloatingAIPaneContextProvider>
}
