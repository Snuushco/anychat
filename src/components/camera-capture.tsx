"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Camera, X, SwitchCamera } from "lucide-react"
import type { FileAttachment } from "./file-upload"

interface CameraCaptureProps {
  onCapture: (attachment: FileAttachment) => void
  disabled?: boolean
}

export function CameraButton({ onCapture, disabled }: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [isSupported, setIsSupported] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    setIsSupported(!!navigator.mediaDevices?.getUserMedia)
  }, [])

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      alert('Camera niet beschikbaar')
      setIsOpen(false)
    }
  }, [])

  const openCamera = useCallback(() => {
    setIsOpen(true)
    startCamera(facingMode)
  }, [facingMode, startCamera])

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setIsOpen(false)
  }, [])

  const toggleFacing = useCallback(() => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    startCamera(next)
  }, [facingMode, startCamera])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

    onCapture({
      id: crypto.randomUUID(),
      name: `foto_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.jpg`,
      type: 'image/jpeg',
      size: Math.round(dataUrl.length * 0.75),
      dataUrl,
      preview: dataUrl,
    })
    closeCamera()
  }, [onCapture, closeCamera])

  if (!isSupported) return null

  return (
    <>
      <button
        onClick={openCamera}
        disabled={disabled}
        className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50 min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-30"
        title="Camera"
      >
        <Camera className="h-4.5 w-4.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-8 flex items-center gap-6">
            <button onClick={closeCamera} className="p-3 rounded-full bg-white/20 text-white">
              <X className="h-6 w-6" />
            </button>
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/30 active:bg-white/60 transition-colors"
            />
            <button onClick={toggleFacing} className="p-3 rounded-full bg-white/20 text-white">
              <SwitchCamera className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
