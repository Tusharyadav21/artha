"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { revealContainer, revealItem } from "@/lib/motion"

interface HeroSectionProps {
  onGetStartedClick: () => void
  reducedMotion?: boolean
}

export function HeroSection({ onGetStartedClick, reducedMotion: _reducedMotion }: HeroSectionProps) {
  return (
    <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden px-6 py-20 lg:px-8">
      {/* Subtle radial gradient backdrop — depth without decoration */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.06)_0%,transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <motion.div
          variants={revealContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8 text-center"
        >
          {/* Badge */}
          <motion.div variants={revealItem}>
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
            variants={revealItem}
            className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            Autonomous RAG that reasons, retrieves, and responds
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={revealItem}
            className="text-lg text-muted-foreground text-pretty sm:text-xl"
          >
            Powered by LangGraph and Ollama. Your data stays local. Build intelligent applications
            that truly understand your knowledge base.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={revealItem} className="flex flex-col gap-4 sm:flex-row sm:justify-center pt-4">
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
            variants={revealItem}
            className="text-sm text-muted-foreground"
          >
            Free and open source. MIT licensed.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
