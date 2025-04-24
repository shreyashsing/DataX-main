"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

export default function SmoothCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [cursorVariant, setCursorVariant] = useState("default")

  useEffect(() => {
    const mouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      })
    }

    window.addEventListener("mousemove", mouseMove)

    return () => {
      window.removeEventListener("mousemove", mouseMove)
    }
  }, [])

  const variants = {
    default: {
      x: mousePosition.x - 16,
      y: mousePosition.y - 16,
    },
    text: {
      height: 150,
      width: 150,
      x: mousePosition.x - 75,
      y: mousePosition.y - 75,
      backgroundColor: "white",
      mixBlendMode: "difference",
    },
  }

  const textEnter = () => setCursorVariant("text")
  const textLeave = () => setCursorVariant("default")

  useEffect(() => {
    const textElements = document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, span, a, button")
    textElements.forEach((elem) => {
      elem.addEventListener("mouseenter", textEnter)
      elem.addEventListener("mouseleave", textLeave)
    })

    return () => {
      textElements.forEach((elem) => {
        elem.removeEventListener("mouseenter", textEnter)
        elem.removeEventListener("mouseleave", textLeave)
      })
    }
  }, [])

  return (
    <>
      <motion.div
        className="smooth-cursor"
        variants={variants}
        animate={cursorVariant}
        transition={{
          type: "spring",
          stiffness: 2000,
          damping: 60,
        }}
      />
      <div className="cursor-dot" style={{ left: mousePosition.x, top: mousePosition.y }} />
    </>
  )
}

