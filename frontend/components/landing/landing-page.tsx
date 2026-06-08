"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useReducedMotion } from "framer-motion"

import { AuthDialog } from "./auth-dialog"
import { StickyNavbar } from "./sticky-navbar"
import { HeroSection } from "./hero-section"
import { CTAFooter } from "./cta-footer"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load below-fold sections
const FeaturesGrid = dynamic(() => import("./features-grid").then((m) => ({ default: m.FeaturesGrid })), {
  loading: () => <SectionSkeleton />,
})
const AISection = dynamic(() => import("./ai-section").then((m) => ({ default: m.AISection })), {
  loading: () => <SectionSkeleton />,
})
const Testimonials = dynamic(() => import("./testimonials").then((m) => ({ default: m.Testimonials })), {
  loading: () => <SectionSkeleton />,
})
const PricingTeaser = dynamic(() => import("./pricing-teaser").then((m) => ({ default: m.PricingTeaser })), {
  loading: () => <SectionSkeleton />,
})

function SectionSkeleton() {
  return (
    <section className="px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
      </div>
    </section>
  )
}

export function LandingPage() {
  const [authOpen, setAuthOpen] = React.useState(false)
  const [authMode, setAuthMode] = React.useState<"login" | "register">("login")
  const prefersReducedMotion = useReducedMotion()

  const handleLoginOpen = () => {
    setAuthMode("login")
    setAuthOpen(true)
  }

  const handleRegisterOpen = () => {
    setAuthMode("register")
    setAuthOpen(true)
  }

  return (
    <div className="min-h-svh bg-background">
      <StickyNavbar
        onLoginOpen={handleLoginOpen}
        onGetStartedOpen={handleRegisterOpen}
      />

      <main className="overflow-hidden">
        <HeroSection
          onGetStartedClick={handleRegisterOpen}
          reducedMotion={prefersReducedMotion ?? false}
        />

        <FeaturesGrid />
        <AISection />
        <Testimonials />
        <PricingTeaser onGetStartedClick={handleRegisterOpen} />
      </main>

      <CTAFooter onGetStartedClick={handleRegisterOpen} />

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
      />
    </div>
  )
}
