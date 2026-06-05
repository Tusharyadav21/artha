"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Quote } from "lucide-react"
import { SectionHeader } from "./section-header"

const testimonials = [
  {
    quote:
      "Agentic RAG made it trivial to build a knowledge assistant that actually understands context. The local inference keeps our data secure.",
    author: "Sarah Chen",
    role: "AI Engineer, Enterprise",
    initials: "SC",
  },
  {
    quote:
      "We replaced our entire RAG pipeline with Agentic RAG. Faster retrieval, better responses, and zero operational overhead.",
    author: "Michael Rodriguez",
    role: "CTO, SaaS Startup",
    initials: "MR",
  },
  {
    quote:
      "The streaming response UI is incredibly smooth. Users feel like they're talking to a real AI, not waiting for batch processing.",
    author: "Emily Watson",
    role: "Product Manager, Tech Company",
    initials: "EW",
  },
]

export function Testimonials() {
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
    <section className="relative px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader 
          title="Loved by developers"
          subtitle="See what teams are building with Agentic RAG"
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group rounded-lg border border-border/50 bg-card/50 p-8 backdrop-blur transition-all hover:border-primary/50 hover:bg-card/80"
            >
              <Quote className="h-5 w-5 text-primary/40" />
              <p className="mt-4 text-sm leading-relaxed text-foreground">{testimonial.quote}</p>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
