"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Logo } from "@/components/shared/logo"

interface CTAFooterProps {
  onGetStartedClick: () => void
}

// fallow-ignore-next-line complexity
export function CTAFooter({ onGetStartedClick }: CTAFooterProps) {
  return (
    <footer className="relative border-t border-border/50 bg-background/80 backdrop-blur">
      {/* Final CTA Section */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start building in minutes
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need is already included. No credit card required.
            </p>
            <Button size="lg" onClick={onGetStartedClick} className="gap-2">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      <Separator className="bg-border/50" />

      {/* Footer */}
      <section className="px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Brand */}
            <div className="space-y-4">
              <Logo />
              <p className="max-w-xs text-sm text-muted-foreground">
                Local-first RAG platform for autonomous reasoning and retrieval.
              </p>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="https://github.com/anthropics/agentic-rag"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/anthropics/agentic-rag#documentation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    Docs
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/anthropics/agentic-rag/discussions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    Community
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="https://github.com/anthropics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    Anthropic
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.langchain.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    LangChain
                  </a>
                </li>
                <li>
                  <a
                    href="https://ollama.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    Ollama
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="my-8 bg-border/30" />

          <div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; 2024 Artha. MIT License.</p>
            <div className="flex gap-6">
              <a
                href="https://github.com/anthropics/agentic-rag"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                GitHub
              </a>
              <a
                href="https://twitter.com/anthropic"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                Twitter
              </a>
            </div>
          </div>
        </div>
      </section>
    </footer>
  )
}
