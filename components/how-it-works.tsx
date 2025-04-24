"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Upload, ShoppingCart, BarChart4 } from "lucide-react"

const steps = [
  {
    icon: <Upload className="h-6 w-6" />,
    title: "Tokenize Your Data",
    description:
      "Convert your datasets into DataNFTs and DataTokens on the Ocean Protocol blockchain, establishing verifiable ownership and enabling controlled access.",
  },
  {
    icon: <ShoppingCart className="h-6 w-6" />,
    title: "List on Marketplace",
    description:
      "Set your terms, pricing models, and access controls. Our AI will help you optimize your listing for maximum visibility and fair market value.",
  },
  {
    icon: <BarChart4 className="h-6 w-6" />,
    title: "Monetize & Analyze",
    description:
      "Track performance, receive payments, and gain insights into how your data is being utilized across the ecosystem.",
  },
]

export default function HowItWorks() {
  const targetRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.4, 1, 0.4])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8])

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden" ref={targetRef}>
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background z-0" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px] z-[1]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg">
            Our platform makes it simple to tokenize, trade, and monetize data assets with blockchain security and AI
            intelligence.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="space-y-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Button className="mt-6 group">
                  Start Tokenizing
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            </div>
          </div>

          <motion.div className="relative h-[400px] lg:h-[500px] order-1 lg:order-2" style={{ opacity, scale }}>
            <div className="absolute inset-0 rounded-2xl overflow-hidden border border-primary/20">
              <Image
                src="/placeholder.svg?height=500&width=500"
                alt="Data tokenization visualization"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent mix-blend-overlay" />
            </div>

            <motion.div
              className="absolute -bottom-6 -right-6 bg-card border border-border rounded-xl p-4 shadow-lg w-64"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Dataset Tokenized</h4>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-primary rounded-full" />
                </div>
                <div className="flex justify-between text-xs">
                  <span>75% Complete</span>
                  <span className="text-primary">DataNFT Created</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function Database(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

