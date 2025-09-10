import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Textarea } from "~/components/ui/textarea"
import { Label } from "~/components/ui/label"
import { UserCheck, Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp, Users, Wifi, WifiOff } from "lucide-react"
import { getPendingApprovals, updateVisitorStatus, Visitor } from "~/api/visitors"
import { getConsultants, Consultant } from "~/api/consultants"
import { getDashboardStats, DashboardStats } from "~/api/analytics"
import { useSSE } from "~/hooks/useSSE"
import { useAuth } from "~/contexts/AuthContext"
import toast from "react-hot-toast"
import { designSystem, getStatusBadgeClass, getConnectionBadgeClass } from "~/lib/design-system"

export function PADashboard() {
  const { user } = useAuth();
  const { connection, lastEvent } = useSSE();
  const [pendingVisitors, setPendingVisitors] = useState<Visitor[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [lastEvent]); // Refetch data when SSE events occur

  const fetchData = async () => {
    try {
      console.log('Fetching PA dashboard data');
      const [pendingResponse, consultantsResponse, statsResponse] = await Promise.all([
        getPendingApprovals() as Promise<{ visitors: Visitor[] }>,
        getConsultants() as Promise<{ consultants: Consultant[] }>,
        getDashboardStats() as Promise<{ stats: DashboardStats }>
      ]);

      setPendingVisitors(pendingResponse.visitors);
      setConsultants(consultantsResponse.consultants);
      setStats(statsResponse.stats);
    } catch (error) {
      console.error('Error fetching PA dashboard data:', error);
      toast.error("Failed to load dashboard data", {
        // title: "Error",
        // description: "Failed to load dashboard data",
        // variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (visitorId: string, action: 'approve' | 'deny', assignedConsultant?: string, notes?: string) => {
    setProcessingId(visitorId);
    try {
      // console.log(`${action}ing visitor:`, { visitorId, assignedConsultant, notes });
      const status = action === 'approve' ? 'approved' : 'denied';
      const response = await updateVisitorStatus(visitorId, {
        status,
        assignedConsultantId: assignedConsultant,
        notes
      }) as { success: boolean; message: string };

      if (response.success) {
        setPendingVisitors(prev => prev.filter(v => v._id !== visitorId));
        toast.success(`Visitor ${action}ed successfully`, {
          // title: "Success",
          // description: `Visitor ${action}d successfully`,
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing visitor:`, error);
      toast.error(`Failed to ${action} visitor`, {
        // title: "Error",
        // description: `Failed to ${action} visitor`,
        // variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className={designSystem.layout.container}>
        <div className="flex items-center justify-between">
          <h1 className={designSystem.typography.pageTitle}>PA Dashboard</h1>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${designSystem.loading.skeleton}`}></div>
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        </div>
        <div className="grid lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={designSystem.loading.card}>
              <div className={`h-6 ${designSystem.loading.skeleton} mb-4`}></div>
              <div className={`h-8 ${designSystem.loading.skeleton}`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={designSystem.layout.container}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={designSystem.typography.pageTitle}>
            Personal Assistant Dashboard
          </h1>
          <p className={designSystem.typography.pageSubtitle}>Manage visitor approvals and consultant assignments</p>
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
          <Badge variant="secondary" className={`text-lg px-6 py-3 ${designSystem.badge.count}`}>
            {pendingVisitors.length} Pending Approvals
          </Badge>
        </div>
      </div>

      {stats && (
        <div className="grid md:grid-cols-4 gap-6">
          <Card className={`${designSystem.statsCard.base} ${designSystem.statsCard.green}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Total Visitors</p>
                  <p className="text-3xl font-bold text-green-900">{stats.totalVisitors}</p>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <TrendingUp className="h-8 w-8 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${designSystem.statsCard.base} ${designSystem.statsCard.yellow}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Pending Approvals</p>
                  <p className="text-3xl font-bold text-yellow-900">{stats.pendingApprovals}</p>
                </div>
                <div className="p-3 bg-yellow-200 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-yellow-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${designSystem.statsCard.base} ${designSystem.statsCard.emerald}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">In Session</p>
                  <p className="text-3xl font-bold text-emerald-900">{stats.inSession}</p>
                </div>
                <div className="p-3 bg-emerald-200 rounded-full">
                  <Users className="h-8 w-8 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${designSystem.statsCard.base} ${designSystem.statsCard.emerald}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Avg Wait Time</p>
                  <p className="text-3xl font-bold text-emerald-900">{stats.averageWaitTime}m</p>
                </div>
                <div className="p-3 bg-emerald-200 rounded-full">
                  <Clock className="h-8 w-8 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className={designSystem.card.base}>
          <CardHeader className="pb-6">
            <CardTitle className={designSystem.typography.cardTitle}>
              <div className={designSystem.iconContainer.warning}>
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2">
              {pendingVisitors.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">No pending approvals</p>
                </div>
              ) : (
                pendingVisitors.map((visitor) => (
                  <ApprovalCard
                    key={visitor._id}
                    visitor={visitor}
                    consultants={consultants}
                    onApprove={(consultantId, notes) => handleApproval(visitor._id, 'approve', consultantId, notes)}
                    onDeny={(notes) => handleApproval(visitor._id, 'deny', undefined, notes)}
                    processing={processingId === visitor._id}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={designSystem.card.base}>
          <CardHeader className="pb-6">
            <CardTitle className={designSystem.typography.cardTitle}>
              <div className={designSystem.iconContainer.secondary}>
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
              Available Consultants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consultants.map((consultant) => (
                <Card key={consultant._id} className={designSystem.card.nested}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-semibold text-gray-900 text-lg">{consultant.name}</span>
                      <Badge className={getStatusBadgeClass(consultant.available ? 'available' : 'busy')}>
                        {consultant.available ? 'Available' : 'Busy'}
                      </Badge>
                    </div>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Specialization:</span>
                        <span>{consultant.specialization.join(', ')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Current Queue:</span>
                        <Badge variant="outline" className="text-xs">
                          {consultant.currentQueue} visitors
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Today&apos;s Sessions:</span>
                        <Badge variant="outline" className="text-xs">
                          {consultant.totalSessions} completed
                        </Badge>
                      </div>
                    </div>
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

interface ApprovalCardProps {
  visitor: Visitor;
  consultants: Consultant[];
  onApprove: (consultantId: string, notes?: string) => void;
  onDeny: (notes?: string) => void;
  processing: boolean;
}

function ApprovalCard({ visitor, consultants, onApprove, onDeny, processing }: ApprovalCardProps) {
  const [selectedConsultant, setSelectedConsultant] = useState<string>('');
  const [notes, setNotes] = useState('');

  const availableConsultants = consultants.filter(c => c.available);

  return (
    <Card className={designSystem.card.gradient}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-lg px-3 py-1 border-2">
              {visitor.tokenId}
            </Badge>
            <span className="font-semibold text-gray-900 text-lg">{visitor.name}</span>
          </div>
          <Badge className={designSystem.badge.status.active}>
            {visitor.service}
          </Badge>
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-6">
          <div className="flex items-center justify-between">
            <span className="font-medium">Phone:</span>
            <span>{visitor.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Wait Time:</span>
            <span>{visitor.waitTime || 0} minutes</span>
          </div>
          {visitor.notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Notes:</span>
              <p className="text-gray-600 mt-1">{visitor.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`consultant-${visitor._id}`} className={designSystem.form.label}>
              Assign Consultant
            </Label>
            <Select onValueChange={setSelectedConsultant}>
              <SelectTrigger className={designSystem.form.select}>
                <SelectValue placeholder="Select consultant" />
              </SelectTrigger>
              <SelectContent>
                {availableConsultants.map((consultant) => (
                  <SelectItem key={consultant._id} value={consultant._id}>
                    {consultant.name} (Queue: {consultant.currentQueue})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`notes-${visitor._id}`} className={designSystem.form.label}>
              PA Notes
            </Label>
            <Textarea
              id={`notes-${visitor._id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for consultant"
              className={`min-h-[80px] ${designSystem.form.textarea}`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => onApprove(selectedConsultant, notes)}
              disabled={!selectedConsultant || processing}
              className={`flex-1 ${designSystem.button.primary}`}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              onClick={() => onDeny(notes)}
              disabled={processing}
              variant="destructive"
              className={`flex-1 ${designSystem.button.destructive}`}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Deny
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}