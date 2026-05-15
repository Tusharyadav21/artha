"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  Zap,
  Search,
  Brain,
  Cpu,
  Zap as Stream,
  Lock,
} from "lucide-react"

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
  const containerVariants = {
    visible: {
      transition: {
        staggerChildren: 0.1,
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

  return (
    <section id="features" className="relative px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Everything you need
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-4 text-lg text-muted-foreground"
          >
            A complete stack for building production-grade RAG applications
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
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
                variants={itemVariants}
                className="group relative rounded-xl border border-border/50 bg-card/50 p-8 backdrop-blur transition-all hover:border-primary/50 hover:bg-card/80"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative z-10">
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
