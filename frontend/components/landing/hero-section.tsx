"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface HeroSectionProps {
  onGetStartedClick: () => void
  reducedMotion?: boolean
}

export function HeroSection({ onGetStartedClick, reducedMotion }: HeroSectionProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  }

  const blobVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.3, 0.4, 0.3],
    },
  }

  return (
    <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden px-6 py-20 lg:px-8">
      {/* Animated gradient blobs */}
      {!reducedMotion && (
        <>
          <motion.div
            className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <div className="relative z-10 mx-auto max-w-4xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8 text-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <Badge
              variant="secondary"
              className="inline-flex gap-2 px-4 py-2 text-xs font-medium"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Local-first AI
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Autonomous RAG that reasons, retrieves, and responds
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-lg text-muted-foreground sm:text-xl"
          >
            Powered by LangGraph and Ollama. Your data stays local. Build intelligent applications
            that truly understand your knowledge base.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:justify-center pt-4">
            <Button
              size="lg"
              onClick={onGetStartedClick}
              className="gap-2"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.open("https://github.com/anthropics/agentic-rag", "_blank")}
            >
              View on GitHub
            </Button>
          </motion.div>

          {/* Trust text */}
          <motion.p
            variants={itemVariants}
            className="text-sm text-muted-foreground"
          >
            Free and open source. MIT licensed.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
