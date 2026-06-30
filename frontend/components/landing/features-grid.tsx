"use client"

import { motion } from "framer-motion"
import {
  Zap,
  Search,
  Brain,
  Cpu,
  Zap as Stream,
  Lock,
} from "lucide-react"
import { SectionHeader } from "./section-header"
import { revealContainer, revealItem } from "@/lib/motion"

const features = [
  {
    icon: Cpu,
    title: "Local Inference",
    description: "Run LLMs locally with Ollama. Your data never leaves your infrastructure.",
  },
  {
    icon: Search,
    title: "Hybrid Search",
    description: "Reciprocal Rank Fusion combines vector and keyword search for optimal retrieval.",
  },
  {
    icon: Brain,
    title: "Agentic Orchestration",
    description: "LangGraph enables multi-step reasoning with self-correction and planning.",
  },
  {
    icon: Zap,
    title: "Background Workers",
    description: "Arq-powered async document processing. Upload, chunk, and embed at scale.",
  },
  {
    icon: Stream,
    title: "Real-time Streaming",
    description: "SSE-based token streaming for a responsive user experience.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "End-to-end encrypted. No API keys, no tracking, no data leaks.",
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="relative px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader 
          title="Everything you need"
          subtitle="A complete stack for building production-grade RAG applications"
        />

        <motion.div
          variants={revealContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                variants={revealItem}
                className="group relative rounded-xl border border-border/50 bg-card/50 p-8 backdrop-blur transition-all hover:border-primary/50 hover:bg-card/80"
              >
                <div className="relative">
                  <Icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
