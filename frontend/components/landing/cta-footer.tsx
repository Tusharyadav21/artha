"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Logo } from "@/components/shared/logo"
import { revealItem } from "@/lib/motion"

interface CTAFooterProps {
  onGetStartedClick: () => void
}

const productLinks = [
  { label: "GitHub", href: "https://github.com/anthropics/agentic-rag" },
  { label: "Docs", href: "https://github.com/anthropics/agentic-rag#documentation" },
  { label: "Community", href: "https://github.com/anthropics/agentic-rag/discussions" },
]

const resourceLinks = [
  { label: "Anthropic", href: "https://github.com/anthropics" },
  { label: "LangChain", href: "https://www.langchain.com" },
  { label: "Ollama", href: "https://ollama.com" },
]

function CTAButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      variants={revealItem}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="space-y-6"
    >
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Start building in minutes
      </h2>
      <p className="text-lg text-muted-foreground">
        Everything you need is already included. No credit card required.
      </p>
      <Button size="lg" onClick={onClick} className="gap-2">
        Get started free
        <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.div>
  )
}

function FooterLinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CTAFooter({ onGetStartedClick }: CTAFooterProps) {
  return (
    <footer className="relative border-t border-border/50 bg-background/80 backdrop-blur">
      {/* Final CTA Section */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <CTAButton onClick={onGetStartedClick} />
        </div>
      </section>

      <Separator className="bg-border/50" />

      {/* Footer */}
      <section className="px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-4">
              <Logo />
              <p className="max-w-xs text-sm text-muted-foreground">
                Local-first RAG platform for autonomous reasoning and retrieval.
              </p>
            </div>
            <FooterLinkColumn title="Product" links={productLinks} />
            <FooterLinkColumn title="Resources" links={resourceLinks} />
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
