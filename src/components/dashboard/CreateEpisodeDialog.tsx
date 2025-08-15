import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Clock, Plus, X } from 'lucide-react'

interface CreateEpisodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEpisodeCreated: () => void
}

export function CreateEpisodeDialog({ open, onOpenChange, onEpisodeCreated }: CreateEpisodeDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [newTimeSlot, setNewTimeSlot] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const addTimeSlot = () => {
    if (newTimeSlot.trim() && !timeSlots.includes(newTimeSlot.trim())) {
      setTimeSlots([...timeSlots, newTimeSlot.trim()])
      setNewTimeSlot('')
    }
  }

  const removeTimeSlot = (timeSlot: string) => {
    setTimeSlots(timeSlots.filter(slot => slot !== timeSlot))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (timeSlots.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one time slot",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { error } = await supabase
        .from('episodes')
        .insert({
          title,
          description,
          date,
          time_slots: timeSlots,
          user_id: user.id
        })

      if (error) throw error

      toast({
        title: "Success!",
        description: "Episode invite created successfully.",
      })

      // Reset form
      setTitle('')
      setDescription('')
      setDate('')
      setTimeSlots([])
      setNewTimeSlot('')
      
      onEpisodeCreated()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTimeSlot.trim()) {
      e.preventDefault()
      addTimeSlot()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Create Episode Invite
          </DialogTitle>
          <DialogDescription>
            Create a new episode and generate a booking link for guests
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Episode Title</Label>
            <Input
              id="title"
              placeholder="e.g., Building the Future of AI"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Episode Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the episode topic..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Episode Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-3">
            <Label>Available Time Slots</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., 2:00 PM - 3:00 PM EST"
                value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addTimeSlot}
                disabled={!newTimeSlot.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {timeSlots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {timeSlots.map((slot, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {slot}
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(slot)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="btn-podcast" disabled={loading}>
              {loading ? "Creating..." : "Create Episode"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}