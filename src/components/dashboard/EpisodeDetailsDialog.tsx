import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Users, Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Episode {
  id: string
  title: string
  description: string
  date: string
  time_slots: string[]
}

interface Guest {
  id: string
  name: string
  email: string
  status: string
  episode_id: string
  selected_time_slot?: string
}

interface EpisodeDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  episode: Episode | null
}

export function EpisodeDetailsDialog({ open, onOpenChange, episode }: EpisodeDetailsDialogProps) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchGuests = async () => {
    if (!episode) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('episode_guests')
        .select('*')
        .eq('episode_id', episode.id)

      if (error) throw error
      setGuests(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load guests",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && episode) {
      fetchGuests()
      
      // Set up real-time subscription
      const channel = supabase
        .channel('episode-guests-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'episode_guests',
            filter: `episode_id=eq.${episode.id}`
          },
          (payload) => {
            console.log('Guest status updated:', payload)
            fetchGuests() // Refresh guest list
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [open, episode])

  if (!episode) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Confirmed</Badge>
      case 'declined':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Declined</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{episode.title}</DialogTitle>
          <DialogDescription className="text-base">
            {episode.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Episode Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Episode Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{formatDate(episode.date)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Available Time Slots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {episode.time_slots.map((slot, index) => (
                    <Badge key={index} variant="outline" className="mr-2">
                      {slot}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Guests Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Invited Guests ({guests.length})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchGuests}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : guests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No guests invited yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {guests.map((guest) => (
                    <div key={guest.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(guest.status)}
                        <div>
                          <p className="font-medium">{guest.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {guest.email}
                          </p>
                          {guest.selected_time_slot && (
                            <p className="text-xs text-primary font-medium">
                              Selected: {guest.selected_time_slot}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(guest.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guest Invitation Flow Info */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-lg text-blue-800">How Guest Invitations Work</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <div className="space-y-2 text-sm">
                <p><strong>1.</strong> Guests receive an email invitation with a unique booking link</p>
                <p><strong>2.</strong> They can visit the link to see available time slots</p>
                <p><strong>3.</strong> Guests select their preferred time slot and confirm attendance</p>
                <p><strong>4.</strong> You'll receive updates when guests respond to invitations</p>
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm font-medium">✅ Complete guest invitation system is now active!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}