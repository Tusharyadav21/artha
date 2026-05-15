"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

interface StickyNavbarProps {
  onLoginOpen: () => void
  onGetStartedOpen: () => void
}

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Pricing", href: "#pricing" },
]

export function StickyNavbar({ onLoginOpen, onGetStartedOpen }: StickyNavbarProps) {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex items-center gap-12">
          <Logo />

          <div className="hidden gap-8 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoginOpen}
            className="hidden sm:inline-flex"
          >
            Sign in
          </Button>
          <Button size="sm" onClick={onGetStartedOpen}>
            Get started
          </Button>
        </div>
      </nav>
    </motion.header>
  )
}
