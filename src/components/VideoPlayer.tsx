import React, { useState, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Camera,
  X,
  Gauge,
  RotateCcw,
  PictureInPicture,
  Download,
} from 'lucide-react'
import { formatDuration } from '../utils/textUtils'

interface VideoPlayerProps {
  src: string
  poster?: string
  fileName?: string
  duration?: number
  onClose?: () => void
  onShowToast?: (message: string) => void
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  fileName,
  duration = 0,
  onClose,
  onShowToast,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const speedOptions = [0.5, 1, 1.25, 1.5, 2]

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setTotalDuration(video.duration)
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const target = Number(e.target.value)
    video.currentTime = target
    setCurrentTime(target)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const val = Number(e.target.value)
    video.volume = val
    setVolume(val)
    setIsMuted(val === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    if (isMuted) {
      video.muted = false
      video.volume = volume || 1
      setIsMuted(false)
    } else {
      video.muted = true
      setIsMuted(true)
    }
  }

  const cyclePlaybackSpeed = () => {
    const video = videoRef.current
    if (!video) return
    const currentIndex = speedOptions.indexOf(playbackSpeed)
    const nextSpeed = speedOptions[(currentIndex + 1) % speedOptions.length]
    video.playbackRate = nextSpeed
    setPlaybackSpeed(nextSpeed)
    onShowToast?.(`Playback speed: ${nextSpeed}x`)
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const togglePiP = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
    } catch (e) {
      onShowToast?.('Picture-in-Picture not supported or failed')
    }
  }

  const copyCurrentFrame = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 360
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D context unavailable')

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ])
          onShowToast?.('Frame copied to clipboard!')
        }
      }, 'image/png')
    } catch (err) {
      onShowToast?.('Failed to capture video frame')
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 2800)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative rounded-2xl overflow-hidden bg-black max-w-lg border border-white/10 shadow-2xl group select-none"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        playsInline
        onClick={togglePlay}
        className="w-full max-h-[420px] object-contain cursor-pointer"
      />

      {/* Close button top-right */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors z-20 cursor-pointer"
          title="Close Player"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Center Play/Pause indicator overlay when paused */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10"
        >
          <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:scale-110 hover:bg-primary-600 transition-all shadow-2xl">
            <Play className="w-7 h-7 fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Custom Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-200 z-20 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Seek Bar */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={totalDuration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary-500 hover:h-2 transition-all"
          />
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            {/* Time Display */}
            <div className="text-[11px] font-mono text-gray-300">
              {formatDuration(currentTime)} / {formatDuration(totalDuration)}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1 group/vol ml-1">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-accent-rose" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Speed Toggle */}
            <button
              type="button"
              onClick={cyclePlaybackSpeed}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono font-bold transition-colors cursor-pointer"
              title="Playback Speed"
            >
              {playbackSpeed}x
            </button>

            {/* Copy Frame */}
            <button
              type="button"
              onClick={copyCurrentFrame}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Copy Frame to Clipboard"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* PiP */}
            <button
              type="button"
              onClick={togglePiP}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Picture-in-Picture"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
