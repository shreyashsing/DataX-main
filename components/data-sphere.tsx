"use client"

import { useRef, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Sphere, MeshDistortMaterial } from "@react-three/drei"
import { useSpring, animated } from "@react-spring/three"
import * as THREE from "three"

function DataNodes({ count = 50 }) {
  const group = useRef<THREE.Group>(null)
  const nodes = useRef<THREE.Mesh[]>([])

  useEffect(() => {
    nodes.current = []
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 16, 16),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.5),
          emissive: new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.5),
          emissiveIntensity: 0.5,
        }),
      )

      const radius = 2 + Math.random() * 1
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta)
      mesh.position.y = radius * Math.sin(phi) * Math.sin(theta)
      mesh.position.z = radius * Math.cos(phi)

      mesh.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
        ),
        initialPosition: mesh.position.clone(),
      }

      if (group.current) {
        group.current.add(mesh)
        nodes.current.push(mesh)
      }
    }

    return () => {
      nodes.current.forEach((node) => {
        node.geometry.dispose()
        ;(node.material as THREE.Material).dispose()
      })
    }
  }, [count])

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.001

      nodes.current.forEach((node) => {
        const data = node.userData
        node.position.add(data.velocity)

        // Keep nodes within bounds
        const distance = node.position.distanceTo(new THREE.Vector3(0, 0, 0))
        if (distance > 3.5) {
          node.position.sub(data.velocity.clone().multiplyScalar(2))
          data.velocity.multiplyScalar(-0.8)
        }
      })
    }
  })

  return <group ref={group} />
}

function ConnectionLines({ count = 30 }) {
  const linesRef = useRef<THREE.LineSegments>(null)

  useEffect(() => {
    if (!linesRef.current) return

    const positions: number[] = []
    const colors: number[] = []

    for (let i = 0; i < count; i++) {
      const radius = 2 + Math.random() * 1.5
      const theta1 = Math.random() * Math.PI * 2
      const phi1 = Math.random() * Math.PI
      const theta2 = Math.random() * Math.PI * 2
      const phi2 = Math.random() * Math.PI

      const x1 = radius * Math.sin(phi1) * Math.cos(theta1)
      const y1 = radius * Math.sin(phi1) * Math.sin(theta1)
      const z1 = radius * Math.cos(phi1)

      const x2 = radius * Math.sin(phi2) * Math.cos(theta2)
      const y2 = radius * Math.sin(phi2) * Math.sin(theta2)
      const z2 = radius * Math.cos(phi2)

      positions.push(x1, y1, z1, x2, y2, z2)

      const color = new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.5)
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      linewidth: 1,
    })

    linesRef.current.geometry = geometry
    linesRef.current.material = material

    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [count])

  useFrame(() => {
    if (linesRef.current) {
      linesRef.current.rotation.y += 0.001
    }
  })

  return <lineSegments ref={linesRef} />
}

function AnimatedSphere() {
  const springs = useSpring({
    scale: [1, 1, 1],
    from: { scale: [0, 0, 0] },
    config: { mass: 2, tension: 120, friction: 14 },
  })

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.4
    const scale = 1 + Math.sin(t) * 0.03
    springs.scale.set([scale, scale, scale])
  })

  return (
    <animated.mesh scale={springs.scale as any}>
      <Sphere args={[2, 64, 64]}>
        <MeshDistortMaterial
          color="#4060ff"
          attach="material"
          distort={0.3}
          speed={2}
          roughness={0.4}
          metalness={0.8}
          opacity={0.6}
          transparent
        />
      </Sphere>
    </animated.mesh>
  )
}

export default function DataSphere() {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4060ff" />

      <AnimatedSphere />
      <DataNodes count={50} />
      <ConnectionLines count={30} />

      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} rotateSpeed={0.5} />
    </Canvas>
  )
}

