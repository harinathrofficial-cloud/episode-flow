import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Clock, Plus, X, Info } from 'lucide-react'

interface CreateEpisodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEpisodeCreated: () => void
}

const formSchema = z.object({
  title: z.string().min(1, "Episode title is required").min(3, "Title must be at least 3 characters"),
  description: z.string().min(1, "Episode description is required").min(10, "Description must be at least 10 characters"),
  date: z.string().min(1, "Episode date is required"),
  timeSlots: z.array(z.object({
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required")
  })).min(1, "At least one time slot is required")
})

type FormData = z.infer<typeof formSchema>

export function CreateEpisodeDialog({ open, onOpenChange, onEpisodeCreated }: CreateEpisodeDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      date: '',
      timeSlots: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "timeSlots"
  })

  const addTimeSlot = () => {
    append({ startTime: '', endTime: '' })
  }

  const handleSubmit = async (data: FormData) => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Format time slots for storage
      const formattedTimeSlots = data.timeSlots.map(slot => 
        `${slot.startTime} - ${slot.endTime}`
      )

      const { error } = await supabase
        .from('episodes')
        .insert({
          title: data.title,
          description: data.description,
          date: data.date,
          time_slots: formattedTimeSlots,
          user_id: user.id
        })

      if (error) throw error

      toast({
        title: "Success!",
        description: "Episode invite created successfully. Share the booking link with your guests!",
      })

      // Reset form
      form.reset()
      
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Create Episode Invite
          </DialogTitle>
          <DialogDescription>
            Create a new episode and generate a booking link for guests to book their preferred time slots
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Episode Title <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Building the Future of AI"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Episode Description <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the episode topic and what guests can expect..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Episode Date <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Available Time Slots <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTimeSlot}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Time Slot
                </Button>
              </div>
              
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add at least one time slot for guests to choose from
                </p>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2 p-3 border rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`timeSlots.${index}.startTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Start Time</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`timeSlots.${index}.endTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">End Time</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(index)}
                      className="mt-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {form.formState.errors.timeSlots?.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.timeSlots.root.message}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">How guests will be notified:</p>
                  <p className="text-blue-700">
                    After creating this episode, you'll get a booking link that you can share with potential guests. 
                    Guests can visit the link to see available time slots and book their preferred time.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-podcast" disabled={loading}>
                {loading ? "Creating..." : "Create Episode"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}