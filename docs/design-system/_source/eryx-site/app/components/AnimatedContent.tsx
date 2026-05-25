// app/components/AnimatedContent.tsx
'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

export default function AnimatedContent({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={fadeIn}
    >
      {children}
    </motion.div>
  )
}