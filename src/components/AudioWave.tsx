interface AudioWaveProps {
  className?: string
  bars?: number
}

export function AudioWave({ className = "", bars = 5 }: AudioWaveProps) {
  return (
    <div className={`audio-wave ${className}`}>
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} className="audio-wave-bar" />
      ))}
    </div>
  )
}