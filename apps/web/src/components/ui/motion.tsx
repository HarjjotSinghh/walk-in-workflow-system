import React from 'react'
import { motion } from 'framer-motion'

// lightweight motion wrapper — keep typing loose to avoid friction with motion props
const Motion = ({ children, className, ...props }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.16 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default Motion
export { Motion }
