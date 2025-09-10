import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Textarea } from "~/components/ui/textarea"
import { Label } from "~/components/ui/label"
import { Stethoscope, Play, Square, Clock, Phone, Wifi, WifiOff } from "lucide-react"
import { getTodayVisitors, updateVisitorStatus, Visitor } from "~/api/visitors"
import toast from "react-hot-toast"
import { useSSE } from "~/hooks/useSSE"
import { useAuth } from "~/contexts/AuthContext"
import { designSystem, getStatusBadgeClass, getConnectionBadgeClass } from "~/lib/design-system"

export function ConsultantDashboard() {
  const [myQueue, setMyQueue] = useState<Visitor[]>([])
  const [completedSessions, setCompletedSessions] = useState<Visitor[]>([])
  const { connection, lastEvent } = useSSE();
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<Visitor | null>(null)
  const [sessionNotes, setSessionNotes] = useState("")
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [lastEvent]) // Refetch data when SSE events occur

  const fetchData = async () => {
    try {
      const response = await getTodayVisitors() as { visitors: Visitor[] }
      const assignedToMe = response.visitors.filter(v => v.assignedConsultant === (user?.name || 'CA Meera Jain'))
      setMyQueue(assignedToMe.filter(v => v.status === 'approved'))
      setCompletedSessions(assignedToMe.filter(v => v.status === 'completed'))
      const inSession = assignedToMe.find(v => v.status === 'in-session')
      if (inSession) {
        setCurrentSession(inSession)
        setSessionStartTime(new Date())
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load consultant data');
    } finally {
      setLoading(false)
    }
  }

  const startSession = async (visitor: Visitor) => {
    try {
      const res = await updateVisitorStatus(visitor._id, { status: 'in-session' }) as { success: boolean }
      if (res.success) {
        setCurrentSession(visitor)
        setSessionStartTime(new Date())
        setMyQueue(prev => prev.filter(v => v._id !== visitor._id))
        toast(
          `Session started with ${visitor.name}`,
        );
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to start session');
    }
  }

  const completeSession = async () => {
    if (!currentSession) return
    try {
      const res = await updateVisitorStatus(currentSession._id, { status: 'completed', notes: sessionNotes }) as { success: boolean }
      if (res.success) {
        setCompletedSessions(prev => [...prev, { ...currentSession, notes: sessionNotes }])
        setCurrentSession(null)
        setSessionNotes("")
        setSessionStartTime(null)
        toast(
          'Session completed',
        );
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to complete session');
    }
  }

  const getSessionDuration = () => {
    if (!sessionStartTime) return '00:00'
    const now = new Date()
    const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
    const minutes = Math.floor(diff / 60)
    const seconds = diff % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className={designSystem.layout.container}>
        <div className="flex items-center justify-between">
          <h1 className={designSystem.typography.pageTitle}>Consultant Dashboard</h1>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${designSystem.loading.skeleton}`}></div>
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {[1,2].map(i => (
            <div key={i} className={designSystem.loading.card}></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={designSystem.layout.container}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={designSystem.typography.pageTitle}>Consultant Dashboard</h1>
          <p className={designSystem.typography.pageSubtitle}>Manage your consultation sessions and queue</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className={`flex items-center gap-2 ${getConnectionBadgeClass(connection.connected)}`}>
            {connection.connected ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Disconnected</span>
              </>
            )}
          </Badge>
          <Badge variant="secondary" className={`px-4 py-2 ${designSystem.badge.role}`}>{user?.name || 'CA Meera Jain'}</Badge>
          <Badge className={`px-3 py-2 ${designSystem.badge.status.available}`}>Available</Badge>
        </div>
      </div>

      {currentSession && (
        <Card className={`${designSystem.card.elevated} border-l-4 border-l-emerald-500 p-0`}>
          <CardHeader className="p-4">
            <CardTitle className={designSystem.typography.cardTitle}>
              <div className={designSystem.iconContainer.secondary}>
                <Play className="h-6 w-6 text-emerald-600" />
              </div>
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{currentSession.name}</div>
                <div className="text-sm text-gray-600 mt-1 flex gap-4">
                  <span className="flex items-center gap-2"><Phone className="h-4 w-4" />{currentSession.phone}</span>
                  <span className="flex items-center gap-2">{currentSession.service}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-emerald-600">{getSessionDuration()}</div>
                <div className="text-sm text-gray-500">Session Duration</div>
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="session-notes" className={designSystem.form.label}>Session Notes</Label>
              <Textarea 
                id="session-notes" 
                value={sessionNotes} 
                onChange={(e) => setSessionNotes(e.target.value)} 
                className={`mt-2 min-h-[120px] ${designSystem.form.textarea}`} 
              />
            </div>

            <div className="mt-4">
              <Button className={`w-full h-12 ${designSystem.button.primary}`} onClick={completeSession}>
                <Square className="mr-2 h-4 w-4"/>
                Complete Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className={designSystem.card.base}>
          <CardHeader className="p-4">
            <CardTitle className={designSystem.typography.cardTitle}>
              <div className={designSystem.iconContainer.primary}>
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              My Queue ({myQueue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {myQueue.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No visitors in queue</div>
              ) : myQueue.map((visitor, idx) => (
                <Card key={visitor._id} className={designSystem.card.nested}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono px-3 py-1">{visitor.tokenId}</Badge>
                        <div className="font-medium">{visitor.name}</div>
                        {idx === 0 && <Badge className={designSystem.badge.status.active}>Next</Badge>}
                      </div>
                      <div className="text-sm text-gray-600">{visitor.waitTime || 0} min</div>
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      <div>Service: {visitor.service}</div>
                      <div>Phone: {visitor.phone}</div>
                    </div>
                    <div className="mt-3">
                      <Button 
                        className={`w-full mt-3 ${designSystem.button.primary}`} 
                        onClick={() => startSession(visitor)} 
                        disabled={!!currentSession}
                      >
                        <Play className="mr-2 h-4 w-4"/>
                        Start Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={designSystem.card.base}>
          <CardHeader className="p-4">
            <CardTitle className={designSystem.typography.cardTitle}>
              <div className={designSystem.iconContainer.secondary}>
                <Stethoscope className="h-6 w-6 text-emerald-600"/>
              </div>
              Today's Completed Sessions ({completedSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {completedSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No completed sessions today</div>
              ) : completedSessions.map(v => (
                <Card key={v._id} className={designSystem.card.gradient}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono px-3 py-1">{v.tokenId}</Badge>
                        <div className="font-medium">{v.name}</div>
                      </div>
                      <Badge className={designSystem.badge.status.completed}>Completed</Badge>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">Duration: {v.sessionDuration || 30} minutes</div>
                    {v.notes && <div className="mt-2 p-2 bg-white rounded-md border border-emerald-200 text-xs text-gray-700">{v.notes}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
