import { ReactNode } from "react"
import "./globals.css"
import { ThemeProvider } from "@/components/shared/theme-provider"
import { Toaster } from "@/components/ui/toast"

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="font-sans antialiased"
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
