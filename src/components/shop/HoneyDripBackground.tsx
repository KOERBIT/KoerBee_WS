'use client'

import { useState, useEffect, useCallback } from 'react'

export default function HoneyDripBackground({ videoUrl }: { videoUrl?: string }) {
  const [offsetY, setOffsetY] = useState(0)

  const handleScroll = useCallback(() => {
    setOffsetY(window.scrollY)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const src = videoUrl || '/honey-drip-compressed.mp4'
  const type = src.endsWith('.webm') ? 'video/webm' : 'video/mp4'

  return (
    <div
      className="fixed top-0 right-0 h-screen pointer-events-none hidden md:block"
      style={{
        zIndex: 40,
        width: 'clamp(220px, 22vw, 380px)',
        maskImage: 'linear-gradient(to left, rgba(0,0,0,.6) 0%, rgba(0,0,0,.25) 65%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,.6) 0%, rgba(0,0,0,.25) 65%, transparent 100%)',
      }}
    >
      <video
        key={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full object-cover"
        style={{
          height: '130%',
          transform: `translateY(${offsetY * -0.15}px)`,
          willChange: 'transform',
          filter: 'saturate(1.3) brightness(1.1) contrast(1.05)',
        }}
      >
        <source src={src} type={type} />
      </video>
    </div>
  )
}
