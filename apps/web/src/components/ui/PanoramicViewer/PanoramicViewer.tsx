'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, Ref } from 'react'
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
import { useParanomicViewersSyncBus } from './providers/ParanomicViewersSyncContextProvider'

export interface PanoramicViewerProps {
  imgSrc: string
  autoPan?: boolean
  /** Optional sync channel name */
  channel?: string
  /** Whether this viewer should publish its pose */
  publish?: boolean
}

export interface PanoramicViewerRef {
  getPose: () => {
    position: { x: number; y: number; z: number }
    quaternion: { x: number; y: number; z: number; w: number }
    target: { x: number; y: number; z: number }
  }
  setPose: (pose: {
    position?: { x: number; y: number; z: number }
    quaternion?: { x: number; y: number; z: number; w: number }
    target?: { x: number; y: number; z: number }
  }) => void
  pausePublishing: () => void
  resumePublishing: () => void
}

const PanoramicViewer = forwardRef(function PanoramicViewer(
  { imgSrc: imageUrl, autoPan, channel, publish = true }: PanoramicViewerProps,
  ref: Ref<PanoramicViewerRef>
) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  const { publish: publishPose, subscribe, unsubscribe } = useParanomicViewersSyncBus()
  const idRef = useRef(Math.random().toString(36).slice(2))
  const publishingRef = useRef(publish)

  const shouldSuppressPublishing = useRef(false)

  // get current pose
  const getPose: PanoramicViewerRef['getPose'] = () => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) {
      return {
        position: { x: 0, y: 0, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        target: { x: 0, y: 0, z: 0 },
      }
    }
    return {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      target: controls.target.clone(),
    }
  }

  // set pose
  const setPose: PanoramicViewerRef['setPose'] = pose => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    if (pose.position) camera.position.set(pose.position.x, pose.position.y, pose.position.z)
    if (pose.quaternion)
      camera.quaternion.set(
        pose.quaternion.x,
        pose.quaternion.y,
        pose.quaternion.z,
        pose.quaternion.w
      )
    if (pose.target) controls.target.set(pose.target.x, pose.target.y, pose.target.z)
    controls.update()
  }

  // Expose imperative API
  useImperativeHandle(
    ref,
    (): PanoramicViewerRef => ({
      getPose,
      setPose,
      pausePublishing: () => {
        publishingRef.current = false
      },
      resumePublishing: () => {
        publishingRef.current = true
      },
    })
  )

  // Setup Three.js scene
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return

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

    camera.position.set(0, 0, 0.1)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.rotateSpeed = -0.25
    controls.enableDamping = true
    controls.dampingFactor = 0.5
    controls.autoRotate = autoPan ?? false
    controls.autoRotateSpeed = 0.25

    cameraRef.current = camera
    controlsRef.current = controls

    // auto-pan idle reset
    let inactivityTimeout: ReturnType<typeof setTimeout> | null = null
    const resetInactivityTimer = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout)
      inactivityTimeout = setTimeout(() => {
        controls.autoRotate = true
      }, 2000)
    }

    if (autoPan) {
      controls.addEventListener('end', () => resetInactivityTimer())
      controls.addEventListener('start', () => {
        controls.autoRotate = false
        resetInactivityTimer()
      })
    }

    controls.update()

    let frameId: number
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      renderer.render(scene, camera)
      controls.update()
    }

    const loader = new TextureLoader()
    loader.load(imageUrl, texture => {
      const geometry = new SphereGeometry(500, 60, 40)
      geometry.scale(-1, 1, 1)
      const material = new MeshBasicMaterial({ map: texture })
      const mesh = new Mesh(geometry, material)
      scene.add(mesh)
      animate()
    })

    const handleResize = () => {
      const w = canvasRef.current!.clientWidth
      const h = canvasRef.current!.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (frameId) cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      if (inactivityTimeout) clearTimeout(inactivityTimeout)
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      renderer.dispose()
      controls.dispose()
      scene.clear()
    }
  }, [imageUrl, autoPan])

  // Publish pose on change
  useEffect(() => {
    if (!channel) return
    const controls = controlsRef.current
    if (!controls) return

    const onChange = () => {
      if (!publishingRef.current) return
      if (shouldSuppressPublishing.current) {
        shouldSuppressPublishing.current = false
        return
      }
      const pose = getPose()
      publishPose(channel, pose, idRef.current)
    }

    controls.addEventListener('change', onChange)
    return () => controls.removeEventListener('change', onChange)
  }, [channel, publishPose, controlsRef.current, getPose])

  // Subscribe to channel updates
  useEffect(() => {
    if (!channel) return

    const cb = (pose: ReturnType<PanoramicViewerRef['getPose']>, originId: string) => {
      if (originId === idRef.current) return
      shouldSuppressPublishing.current = true
      setPose(pose)
    }

    subscribe(channel, { id: idRef.current, callback: cb })
    return () => unsubscribe(channel, { id: idRef.current, callback: cb })
  }, [channel, subscribe, unsubscribe, setPose, controlsRef.current])

  return (
    <div
      ref={canvasRef}
      className="w-full min-h-[50vh] cursor-grab active:cursor-grabbing relative touch-none"
    >
      <span className="absolute top-1/2 left-1/2 -translate-1/2 -z-10 text-white">Loading...</span>
      <div className="bg-slate-500 absolute inset-0 -z-20"></div>
    </div>
  )
})

export default PanoramicViewer
