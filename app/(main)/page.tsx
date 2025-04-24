import type { Metadata } from "next"
import Hero from "@/components/hero"
import Features from "@/components/features"
import HowItWorks from "@/components/how-it-works"
import Marketplace from "@/components/marketplace"
import Testimonials from "@/components/testimonials"
import CallToAction from "@/components/call-to-action"

export const metadata: Metadata = {
  title: "DataX | AI-Powered Data Exchange Marketplace",
  description: "A decentralized platform for secure and efficient exchange of data assets using blockchain and AI",
}

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <Marketplace />
      <Testimonials />
      <CallToAction />
    </main>
  )
} 