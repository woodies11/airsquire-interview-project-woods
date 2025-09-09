'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { useFloatingAIPaneContext } from './FloatingAIPaneContextProvider'
import { IoCloseCircleOutline } from 'react-icons/io5'
import { GiPolarStar } from 'react-icons/gi'

export default function FloatingAIPane() {
  const dragRef = useRef<HTMLDivElement>(null)
  const { isOpen, closeAIPanel, toggleAIPanel } = useFloatingAIPaneContext()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <>
      <motion.div
        ref={dragRef}
        aria-label="ai-panel-drag-constraint"
        className="fixed inset-5 pointer-events-none"
      ></motion.div>
      <div className="fixed inset-5 pointer-events-none">
        <div className="w-full h-full relative pointer-events-none">
          <AnimatePresence>
            {!isOpen && (
              <motion.button
                layoutId="aipanel"
                aria-label="open-ai-panel"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                  duration: 0.3,
                }}
                className={clsx(
                  'fixed left-8 bottom-8 h-12 w-12 pointer-events-auto',
                  'bg-asq-primary rounded-full shadow-2xl text-white text-3xl font-bold',
                  'flex items-center justify-center',
                  'active:scale-95 cursor-pointer'
                )}
                onClick={toggleAIPanel}
              >
                <GiPolarStar size={24} />
              </motion.button>
            )}
          </AnimatePresence>
          {isOpen && (
            <motion.div
              drag
              layoutId="aipanel"
              animate={isOpen ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: isCollapsed ? 25 : 18,
                duration: 0.3,
              }}
              dragConstraints={dragRef}
              dragElastic={0.2}
              className={clsx(
                'absolute left-0 bottom-0 w-[400px]',
                'bg-asq-background-dark border border-gray-200 shadow-2xl rounded-lg',
                {
                  'pointer-events-auto': isOpen,
                  'h-[640px]': !isCollapsed,
                }
              )}
            >
              <div className="w-full h-full relative flex flex-col">
                <div className="h-12 bg-asq-primary cursor-grab active:cursor-grabbing rounded-t-lg overflow-hidden">
                  <div className="h-full w-full grid grid-cols-3 justify-center items-center">
                    <div></div>
                    <div className="text-white font-medium text-center">AI Analysis</div>
                    <div className="flex justify-end pr-1">
                      {/* <button
                        aria-label="collapse-ai-panel"
                        className="text-white text-lg font-bold hover:text-asq-accent active:scale-95 p-2 cursor-pointer"
                        onClick={() => setIsCollapsed(prev => !prev)}
                      >
                        {isCollapsed ? '▾' : '▴'}
                      </button> */}
                      <button
                        aria-label="close-ai-panel"
                        className="text-white text-lg font-bold hover:text-asq-accent active:scale-95 p-2 cursor-pointer"
                        onClick={closeAIPanel}
                      >
                        <IoCloseCircleOutline size={24} />
                      </button>
                    </div>
                  </div>
                </div>
                <motion.div className="flex-1 p-4 text-white overflow-auto min-h-0">
                  Hello
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}
