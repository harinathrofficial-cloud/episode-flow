import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from './DashboardLayout'
import { CreateEpisodeDialog } from './CreateEpisodeDialog'
import { EpisodeDetailsDialog } from './EpisodeDetailsDialog'
import { Plus, Calendar, Clock, Users, Mic2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Episode {
  id: string
  title: string
  description: string
  date: string
  time_slots: string[]
  created_at: string
  guest_count?: number
  confirmed_guests?: number
  pending_guests?: number
  episode_guests?: Array<{
    id: string
    name: string
    email: string
    status: string
    selected_time_slot?: string
  }>
}

export function Dashboard() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const { toast } = useToast()

  const fetchEpisodes = async () => {
    try {
      const { data, error } = await supabase
        .from('episodes')
        .select(`
          *,
          episode_guests (
            id,
            name,
            email,
            status,
            selected_time_slot
          )
        `)
        .order('date', { ascending: true })

      if (error) throw error

      // Process the data to add computed fields
      const processedData = data?.map(episode => ({
        ...episode,
        guest_count: episode.episode_guests?.length || 0,
        confirmed_guests: episode.episode_guests?.filter(g => g.status === 'confirmed').length || 0,
        pending_guests: episode.episode_guests?.filter(g => g.status === 'pending').length || 0
      })) || []

      setEpisodes(processedData)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load episodes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEpisodes()

    // Set up real-time listener for guest responses
    const channel = supabase
      .channel('guest-responses')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'episode_guests'
        },
        (payload) => {
          console.log('Guest response received:', payload)
          const { old: oldRecord, new: newRecord } = payload
          
          // Check if status changed from pending to confirmed or if time slot was selected
          if (oldRecord.status === 'pending' && newRecord.status === 'confirmed') {
            toast({
              title: "🎉 Guest Response!",
              description: `${newRecord.name} has confirmed their attendance and selected a time slot!`,
              duration: 5000
            })
            
            // Refresh episodes to update counts
            fetchEpisodes()
          } else if (!oldRecord.selected_time_slot && newRecord.selected_time_slot) {
            toast({
              title: "⏰ Time Slot Selected",
              description: `${newRecord.name} has selected: ${newRecord.selected_time_slot}`,
              duration: 4000
            })
            
            // Refresh episodes to update counts
            fetchEpisodes()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading episodes...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Manage your podcast episodes and guest bookings
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="btn-podcast flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Episode Invite
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-podcast">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Episodes</CardTitle>
              <Mic2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{episodes.length}</div>
            </CardContent>
          </Card>
          
          <Card className="card-podcast">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Episodes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {episodes.filter(ep => new Date(ep.date) > new Date()).length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-podcast">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {episodes.reduce((total, ep) => total + (ep.guest_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Episodes List */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Your Episodes</h3>
          
          {episodes.length === 0 ? (
            <Card className="card-podcast">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mic2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No episodes yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first episode invite to start scheduling guests
                </p>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="btn-podcast"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Episode Invite
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {episodes.map((episode) => (
                <Card key={episode.id} className="card-podcast">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{episode.title}</CardTitle>
                        <CardDescription>{episode.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(episode.date)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                   <CardContent>
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4 text-sm text-muted-foreground">
                         <div className="flex items-center gap-1">
                           <Clock className="h-4 w-4" />
                           {episode.time_slots.length} time slots
                         </div>
                         <div className="flex items-center gap-1">
                           <Users className="h-4 w-4" />
                           {episode.guest_count || 0} guests
                         </div>
                         {episode.confirmed_guests ? (
                           <div className="flex items-center gap-1 text-green-600">
                             <CheckCircle className="h-4 w-4" />
                             {episode.confirmed_guests} confirmed
                           </div>
                         ) : null}
                         {episode.pending_guests ? (
                           <div className="flex items-center gap-1 text-amber-600">
                             <AlertCircle className="h-4 w-4" />
                             {episode.pending_guests} pending
                           </div>
                         ) : null}
                       </div>
                       <div className="flex items-center gap-2">
                         {episode.confirmed_guests && episode.confirmed_guests > 0 ? (
                           <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                             {episode.confirmed_guests} New Response{episode.confirmed_guests > 1 ? 's' : ''}!
                           </Badge>
                         ) : null}
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={() => {
                             setSelectedEpisode(episode)
                             setShowDetailsDialog(true)
                           }}
                         >
                           View Details
                         </Button>
                       </div>
                     </div>
                   </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateEpisodeDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onEpisodeCreated={fetchEpisodes}
      />

      <EpisodeDetailsDialog 
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        episode={selectedEpisode}
      />
    </DashboardLayout>
  )
}