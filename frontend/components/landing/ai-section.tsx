"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { SectionHeader } from "./section-header"

export function AISection() {
  const pipelineSteps = [
    {
      number: "1",
      title: "Retrieve",
      description: "Vector + keyword search retrieves relevant chunks with context",
    },
    {
      number: "2",
      title: "Rerank",
      description: "Intelligent reranking prioritizes the most relevant results",
    },
    {
      number: "3",
      title: "Respond",
      description: "LLM generates citations with source attribution",
    },
  ]

  const stepVariants = {
    hidden: { opacity: 0, x: 24 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        delay: i * 0.15,
      },
    } as const),
  }

  return (
    <section id="capabilities" className="relative px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader 
          title="Intelligence that understands context"
          subtitle="A three-stage pipeline for accurate, sourced retrieval-augmented generation"
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {pipelineSteps.map((step, i) => (
            <motion.div
              key={step.number}
              custom={i}
              variants={stepVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative"
            >
              {/* Connection line */}
              {i < pipelineSteps.length - 1 && (
                <motion.div
                  className="absolute -right-4 top-1/2 hidden w-8 -translate-y-1/2 lg:block"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (i + 1) * 0.15 }}
                  style={{ originX: 0 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-0.5 w-4 bg-primary/50" />
                    <ArrowRight className="h-4 w-4 text-primary/50" />
                  </div>
                </motion.div>
              )}

              <div className="rounded-lg border border-border/50 bg-card/50 p-6 backdrop-blur">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Code snippet highlight */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 overflow-hidden rounded-lg border border-border/50 bg-muted/30 p-6 backdrop-blur"
        >
          <div className="space-y-2 font-mono text-sm">
            <div className="text-muted-foreground">
              <span className="text-primary">const</span>{" "}
              <span className="text-yellow-500">response</span> ={" "}
              <span className="text-primary">await</span> rag.
              <span className="text-blue-500">invoke</span>
              {`({`}
            </div>
            <div className="ml-4 text-muted-foreground">
              query: <span className="text-green-500">"How does RAG work?"</span>,
            </div>
            <div className="ml-4 text-muted-foreground">
              documents: <span className="text-yellow-500">scopedDocs</span>,
            </div>
            <div className="text-muted-foreground">{`})`}</div>
            <div className="pt-2 text-primary">
              {`// → retrieves → reranks → generates response with citations`}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
