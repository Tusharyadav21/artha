import * as React from "react"
import { motion } from "framer-motion"

interface SectionHeaderProps {
  title: string
  subtitle: string
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="text-center">
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="text-3xl font-bold tracking-tight sm:text-4xl"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="mt-4 text-lg text-muted-foreground"
      >
        {subtitle}
      </motion.p>
    </div>
  )
}
