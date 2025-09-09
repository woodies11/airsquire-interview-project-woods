'use client'

import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useState,
} from 'react'
import FloatingAIPane from './FloatingAIPane'

type FloatingAIPaneContextType = {
  isOpen: boolean
  openAIPanel: () => void
  closeAIPanel: () => void
  toggleAIPanel: () => void

  aiResponse: string
  setAIResponse: Dispatch<SetStateAction<string>>
}

const initialValues = {
  isOpen: false,
  openAIPanel: () => {},
  closeAIPanel: () => {},
  toggleAIPanel: () => {},

  aiResponse: '',
  setAIResponse: () => {},
}

export const FloatingAIPaneContext = createContext<FloatingAIPaneContextType>(initialValues)

function FloatingAIPaneContextProvider({ children }: PropsWithChildren<{}>) {
  const [isOpen, setIsOpen] = useState(false)

  const openAIPanel = () => setIsOpen(true)
  const closeAIPanel = () => setIsOpen(false)
  const toggleAIPanel = () => setIsOpen(prev => !prev)

  const [aiResponse, setAIResponse] = useState('')

  return (
    <FloatingAIPaneContext.Provider
      value={{ isOpen, openAIPanel, closeAIPanel, toggleAIPanel, aiResponse, setAIResponse }}
    >
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
