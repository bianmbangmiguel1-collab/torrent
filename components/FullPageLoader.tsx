'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface FullPageLoaderProps {
  show: boolean
  message?: string
  submessage?: string
}

export default function FullPageLoader({
  show,
  message = 'Chargement…',
  submessage,
}: FullPageLoaderProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9998] bg-white/70 backdrop-blur-sm flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 10 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 flex flex-col items-center gap-4 min-w-[260px]"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-10 h-10 text-indigo-600" />
            </motion.div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">{message}</p>
              {submessage && (
                <p className="text-sm text-gray-500 mt-1">{submessage}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}