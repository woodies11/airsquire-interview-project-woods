'use client'

import { useEffect, useRef, useState } from 'react'
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  TextureLoader,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls'

export interface PanoramicViewerProps {
  imgSrc: string
}

export default function PanoramicViewer({ imgSrc: imageUrl }: PanoramicViewerProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!imageUrl) return
    if (!canvasRef.current) return

    const scene = new Scene()
    const camera = new PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    )
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)
    canvasRef.current.appendChild(renderer.domElement)

    // Position camera inside the sphere
    camera.position.set(0, 0, 0.1)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.rotateSpeed = -0.25
    controls.enableDamping = true
    controls.dampingFactor = 0.5
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.25

    let inactivityTimeout: ReturnType<typeof setTimeout> | null = null
    const resetInactivityTimer = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout)
      inactivityTimeout = setTimeout(() => {
        controls.autoRotate = true
      }, 2000)
    }

    controls.addEventListener('end', () => resetInactivityTimer())

    controls.addEventListener('start', () => {
      controls.autoRotate = false
      resetInactivityTimer()
    })

    controls.update()

    // Render loop
    let frameId: number
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      renderer.render(scene, camera)
      controls.update()
    }

    const loader = new TextureLoader()
    loader.load(imageUrl, texture => {
      const geometry = new SphereGeometry(500, 60, 40)
      geometry.scale(-1, 1, 1) // Invert the sphere to render the inside
      const material = new MeshBasicMaterial({ map: texture })
      const mesh = new Mesh(geometry, material)
      scene.add(mesh)
      animate()
    })

    const handleResize = () => {
      const w = canvasRef.current.clientWidth
      const h = canvasRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      // Stop the animation loop
      if (frameId) {
        cancelAnimationFrame(frameId)
      }

      // Clean up event listeners
      controls.removeEventListener('start', resetInactivityTimer)
      controls.removeEventListener('end', resetInactivityTimer)
      window.removeEventListener('resize', handleResize)

      // clear the inactivity timeout
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout)
        inactivityTimeout = null
      }

      // Remove canvas, either from parent node or from canvasRef
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      if (canvasRef.current?.contains(renderer.domElement)) {
        canvasRef.current.removeChild(renderer.domElement)
      }

      // Free up memory and resources
      renderer.dispose()
      controls.dispose()
      scene.clear()
    }
  }, [imageUrl])

  return (
    <div
      ref={canvasRef}
      className="w-full min-h-[50vh] max-h-[60vh] cursor-grab active:cursor-grabbing relative touch-none"
    >
      <span className="absolute top-1/2 left-1/2 -translate-1/2 -z-10 text-white">Loading...</span>
      <div className="bg-slate-500 absolute inset-0 -z-20"></div>
    </div>
  )
}
