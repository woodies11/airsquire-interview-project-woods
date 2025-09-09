'use client'

import { createContext, PropsWithChildren, useContext, useState } from 'react'
import FloatingAIPane from './FloatingAIPane'

type FloatingAIPaneContextType = {
  isOpen: boolean
  openAIPanel: () => void
  closeAIPanel: () => void
  toggleAIPanel: () => void
}

const initialValues = {
  isOpen: false,
  openAIPanel: () => {},
  closeAIPanel: () => {},
  toggleAIPanel: () => {},
}

export const FloatingAIPaneContext = createContext<FloatingAIPaneContextType>(initialValues)

function FloatingAIPaneContextProvider({ children }: PropsWithChildren<{}>) {
  const [isOpen, setIsOpen] = useState(false)

  const openAIPanel = () => setIsOpen(true)
  const closeAIPanel = () => setIsOpen(false)
  const toggleAIPanel = () => setIsOpen(prev => !prev)

  return (
    <FloatingAIPaneContext.Provider value={{ isOpen, openAIPanel, closeAIPanel, toggleAIPanel }}>
      {children}

      <FloatingAIPane />
    </FloatingAIPaneContext.Provider>
  )
}

export default FloatingAIPaneContextProvider

export function useFloatingAIPaneContext() {
  const context = useContext(FloatingAIPaneContext)
  if (context === undefined) {
    throw new Error('useFloatingAIPaneContext must be used within a FloatingAIPaneContextProvider')
  }
  return context
}
