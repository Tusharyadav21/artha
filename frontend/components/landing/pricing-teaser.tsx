"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "./section-header"
import { revealContainer, revealItem } from "@/lib/motion"

interface PricingTeaserProps {
  onGetStartedClick: () => void
}

const plans = [
  {
    name: "Open Source",
    description: "For individual developers and small teams",
    price: "Free",
    features: [
      "Local inference with Ollama",
      "Hybrid search (vector + keyword)",
      "PostgreSQL with pgvector",
      "Background processing with Arq",
      "Real-time streaming responses",
      "MIT License",
    ],
    highlighted: false,
  },
  {
    name: "Self-Hosted",
    description: "For enterprises with custom requirements",
    price: "Custom",
    features: [
      "Everything in Open Source",
      "Multi-workspace management",
      "Advanced monitoring & observability",
      "Custom model integration",
      "Priority community support",
      "Commercial license option",
    ],
    highlighted: true,
  },
]

export function PricingTeaser({ onGetStartedClick }: PricingTeaserProps) {
  return (
    <section id="pricing" className="relative px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader 
          title="Simple, transparent pricing"
          subtitle="Start free, scale at your own pace"
        />

        <motion.div
          variants={revealContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-16 grid gap-8 lg:grid-cols-2"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={revealItem}
              className={`relative rounded-xl border p-8 backdrop-blur transition-all ${
                plan.highlighted
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/10"
                  : "border-border/50 bg-card/50"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Most popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mt-6">
                <span className="text-3xl font-bold">{plan.price}</span>
              </div>

              <Button
                onClick={onGetStartedClick}
                variant={plan.highlighted ? "default" : "outline"}
                className="mt-6 w-full"
              >
                Get started
              </Button>

              <div className="mt-8 space-y-4">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
