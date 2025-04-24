"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Shield, Database, Zap, Lock, BarChart, Search } from "lucide-react"

const features = [
  {
    icon: <Shield className="h-10 w-10" />,
    title: "Secure Transactions",
    description:
      "Blockchain-powered security ensures tamper-proof transactions and data integrity throughout the marketplace.",
  },
  {
    icon: <Database className="h-10 w-10" />,
    title: "DataNFTs & Tokens",
    description:
      "Tokenize your datasets as unique NFTs and fungible tokens, enabling fractional ownership and flexible trading.",
  },
  {
    icon: <Zap className="h-10 w-10" />,
    title: "AI-Driven Matching",
    description:
      "Our AI algorithms connect data providers with the perfect buyers based on needs and dataset characteristics.",
  },
  {
    icon: <Lock className="h-10 w-10" />,
    title: "Privacy Preserved",
    description:
      "Advanced cryptographic techniques protect sensitive information while enabling valuable data exchange.",
  },
  {
    icon: <BarChart className="h-10 w-10" />,
    title: "Fair Pricing Models",
    description: "AI-powered pricing recommendations ensure fair market value for all data assets on the platform.",
  },
  {
    icon: <Search className="h-10 w-10" />,
    title: "Smart Discovery",
    description: "Intelligent search and recommendation systems help you find exactly the data you need.",
  },
]

export default function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  }

  return (
    <section id="features" className="py-24 relative overflow-hidden">
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Revolutionizing Data Exchange</h2>
          <p className="text-muted-foreground text-lg">
            Our platform combines blockchain security with AI-powered intelligence to create a new paradigm for data
            marketplaces.
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 hover:border-primary/50 transition-colors"
              variants={itemVariants}
            >
              <div className="rounded-lg bg-primary/10 w-16 h-16 flex items-center justify-center mb-4 text-primary">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

