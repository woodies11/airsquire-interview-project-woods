'use client'

import { useEffect, useRef } from 'react'
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
  imageUrl: string
}

export default function PanoramicViewer({ imageUrl }: PanoramicViewerProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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

    // Load panoramic texture
    const loader = new TextureLoader()
    loader.load(imageUrl, texture => {
      const geometry = new SphereGeometry(500, 60, 40)
      geometry.scale(-1, 1, 1) // Invert the sphere to render the inside
      const material = new MeshBasicMaterial({ map: texture })
      const mesh = new Mesh(geometry, material)
      scene.add(mesh)

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

      controls.addEventListener('end', () => {
        resetInactivityTimer()
      })

      controls.addEventListener('start', () => {
        controls.autoRotate = false
        resetInactivityTimer()
      })

      controls.update()

      // Render loop
      const animate = () => {
        requestAnimationFrame(animate)
        renderer.render(scene, camera)
        controls.update()
      }
      animate()
    })

    const handleResize = () => {
      const w = canvasRef.current.clientWidth
      const h = canvasRef.current.clientHeight
      console.log({ w, h })
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      canvasRef.current?.removeChild(renderer.domElement)
    }
  }, [canvasRef.current, imageUrl])

  return (
    <div
      ref={canvasRef}
      className="bg-slate-500 w-full min-h-[50vh] max-h-[60vh] cursor-grab active:cursor-grabbing"
    />
  )
}
