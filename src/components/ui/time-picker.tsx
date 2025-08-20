import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TimePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TimePicker({ value, onChange, placeholder = "Select time", disabled, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hours, setHours] = React.useState(value ? value.split(':')[0] : '09')
  const [minutes, setMinutes] = React.useState(value ? value.split(':')[1] : '00')

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':')
      setHours(h)
      setMinutes(m)
    }
  }, [value])

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    const timeString = `${newHours.padStart(2, '0')}:${newMinutes.padStart(2, '0')}`
    onChange(timeString)
    setIsOpen(false)
  }

  const formatTime = (time: string) => {
    if (!time) return placeholder
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${hour12}:${m} ${ampm}`
  }

  const generateHours = () => {
    return Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  }

  const generateMinutes = () => {
    return Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatTime(value || '')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Hours</label>
              <div className="h-32 overflow-y-auto border rounded">
                {generateHours().map((hour) => (
                  <button
                    key={hour}
                    className={cn(
                      "w-full px-3 py-1 text-sm hover:bg-accent text-left",
                      hours === hour && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => setHours(hour)}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Minutes</label>
              <div className="h-32 overflow-y-auto border rounded">
                {generateMinutes().map((minute) => (
                  <button
                    key={minute}
                    className={cn(
                      "w-full px-3 py-1 text-sm hover:bg-accent text-left",
                      minutes === minute && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => setMinutes(minute)}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => handleTimeChange(hours, minutes)}>
              Set Time
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}