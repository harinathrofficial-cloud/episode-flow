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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Clock, Plus, X, Info, Mail, Users } from 'lucide-react'

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
    .superRefine((timeSlots, ctx) => {
      timeSlots.forEach((slot, index) => {
        if (slot.startTime && slot.endTime && slot.startTime >= slot.endTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Start time must be before end time",
            path: [index, "startTime"]
          });
        }
      });
    }),
  guests: z.array(z.object({
    name: z.string().min(1, "Guest name is required"),
    email: z.string().email("Valid email is required")
  })).optional()
})

type FormData = z.infer<typeof formSchema>

export function CreateEpisodeDialog({ open, onOpenChange, onEpisodeCreated }: CreateEpisodeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [sendingInvites, setSendingInvites] = useState(false)
  const { toast } = useToast()
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      date: '',
      timeSlots: [],
      guests: []
    }
  })

  const { fields: timeSlotFields, append: appendTimeSlot, remove: removeTimeSlot } = useFieldArray({
    control: form.control,
    name: "timeSlots"
  })

  const { fields: guestFields, append: appendGuest, remove: removeGuest } = useFieldArray({
    control: form.control,
    name: "guests"
  })

  const addTimeSlot = () => {
    appendTimeSlot({ startTime: '', endTime: '' })
  }

  const addGuest = () => {
    appendGuest({ name: '', email: '' })
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

      const { data: episode, error } = await supabase
        .from('episodes')
        .insert({
          title: data.title,
          description: data.description,
          date: data.date,
          time_slots: formattedTimeSlots,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Send invitations to guests if any
      if (data.guests && data.guests.length > 0) {
        setSendingInvites(true)
        await sendInvitations(episode.id, data.guests)
      }

      toast({
        title: "Success!",
        description: `Episode created successfully${data.guests?.length ? ' and invitations sent' : ''}!`,
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
      setSendingInvites(false)
    }
  }

  const sendInvitations = async (episodeId: string, guests: { name: string; email: string }[]) => {
    const invitePromises = guests.map(guest => 
      supabase.functions.invoke('send-invitation', {
        body: {
          episodeId,
          guestName: guest.name,
          guestEmail: guest.email
        }
      })
    )

    try {
      await Promise.all(invitePromises)
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast({
        title: "Warning",
        description: "Episode created but some invitations failed to send",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Create Episode Invite
          </DialogTitle>
          <DialogDescription>
            Create a new episode and send invitations to guests
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

            {/* Time Slots Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Available Time Slots <span className="text-destructive">*</span>
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTimeSlot}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Slot
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {timeSlotFields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Add at least one time slot for guests to choose from
                  </p>
                )}

                <div className="space-y-3">
                  {timeSlotFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 p-3 border rounded-lg">
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
                        onClick={() => removeTimeSlot(index)}
                        className="self-start"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Guests Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Invite Guests
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addGuest}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Guest
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {guestFields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Optionally add guests to send them invitation emails
                  </p>
                )}

                <div className="space-y-3">
                  {guestFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name={`guests.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Guest Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="John Doe"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`guests.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="john@example.com"
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
                        onClick={() => removeGuest(index)}
                        className="self-start"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">How it works:</p>
                  <div className="text-blue-700 space-y-1">
                    <p>• Guests receive email invitations with unique booking links</p>
                    <p>• They can select their preferred time slot and confirm attendance</p>
                    <p>• You'll see real-time updates when guests respond</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || sendingInvites}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="btn-podcast" 
                disabled={loading || sendingInvites}
              >
                {loading ? "Creating..." : sendingInvites ? "Sending Invites..." : "Create Episode"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}