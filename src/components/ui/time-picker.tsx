import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TimePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TimePicker({ value, onChange, placeholder = "Select time", disabled, className }: TimePickerProps) {
  const [timeInput, setTimeInput] = React.useState(value || '')

  React.useEffect(() => {
    setTimeInput(value || '')
  }, [value])

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTimeInput(newTime)
    onChange(newTime)
  }

  const formatDisplayTime = (time: string) => {
    if (!time) return placeholder
    try {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${hour12}:${minutes} ${ampm}`
    } catch {
      return time || placeholder
    }
  }

  return (
    <div className="relative">
      <Input
        type="time"
        value={timeInput}
        onChange={handleTimeChange}
        disabled={disabled}
        className={cn(
          "w-full pr-10",
          !timeInput && "text-muted-foreground",
          className
        )}
        placeholder={placeholder}
      />
      <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}