import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import {
  Settings,
  BarChart3,
  Users,
  Download,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  TrendingUp,
  Clock,
  CheckCircle,
  Wifi,
  WifiOff,
  Calendar,
  Search,
  Filter
} from "lucide-react"
import { getDashboardStats, DashboardStats } from "~/api/analytics"
import { getTodayVisitors, Visitor } from "~/api/visitors"
import { getServices, Service } from "~/api/services"
import { getConsultants, Consultant } from "~/api/consultants"
import { getAuditTrail, exportVisitorData, AuditRecord } from "~/api/audit"
import toast from "react-hot-toast"
import { useSSE } from "~/hooks/useSSE"
import { useAuth } from "~/contexts/AuthContext"
import { designSystem, getStatusBadgeClass, getConnectionBadgeClass } from "~/lib/design-system"

export function AdminDashboard() {
  const { user } = useAuth();
  const { connection, lastEvent } = useSSE();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({
    startDate: '',
    endDate: '',
    entity: '',
    entityId: ''
  });

  useEffect(() => {
    fetchData();
  }, [lastEvent]); // Refetch data when SSE events occur

  const fetchData = async () => {
    try {
      console.log('Fetching admin dashboard data');
      const [statsResponse, visitorsResponse, servicesResponse, consultantsResponse] = await Promise.all([
        getDashboardStats() as Promise<{ stats: DashboardStats }>,
        getTodayVisitors() as Promise<{ visitors: Visitor[] }>,
        getServices() as Promise<{ services: Service[] }>,
        getConsultants() as Promise<{ consultants: Consultant[] }>
      ]);

      setStats(statsResponse.stats);
      setVisitors(visitorsResponse.visitors);
      setServices(servicesResponse.services);
      setConsultants(consultantsResponse.consultants);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditTrail = async () => {
    setAuditLoading(true);
    try {
      const response = await getAuditTrail({
        startDate: auditFilters.startDate || undefined,
        endDate: auditFilters.endDate || undefined,
        entity: auditFilters.entity || undefined,
        entityId: auditFilters.entityId || undefined
      });
      setAuditRecords(response.auditRecords);
    } catch (error) {
      console.error('Error loading audit trail:', error);
      toast.error('Failed to load audit trail');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      await exportVisitorData({
        startDate: auditFilters.startDate || undefined,
        endDate: auditFilters.endDate || undefined
      });
      toast.success("Data exported successfully",{
        // title: "Export Complete",
        // description: "Data has been exported successfully",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export data", {
        // title: "Export Failed",
        // description: "Failed to export data",
        // variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className={designSystem.layout.container}>
        <div className="flex items-center justify-between">
          <h1 className={designSystem.typography.pageTitle}>Admin Dashboard</h1>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={designSystem.loading.card}>
              <div className={`h-6 ${designSystem.loading.skeleton} mb-2`}></div>
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
          <h1 className={designSystem.typography.pageTitle}>Admin Dashboard</h1>
          <p className={designSystem.typography.pageSubtitle}>Comprehensive system management and analytics</p>
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
          <Badge variant="secondary" className={`text-lg px-6 py-3 ${designSystem.badge.role}`}>
            System Administrator
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
                  <Clock className="h-8 w-8 text-yellow-700" />
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

          <Card className={`${designSystem.statsCard.base} ${designSystem.statsCard.gray}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
                </div>
                <div className="p-3 bg-gray-200 rounded-full">
                  <CheckCircle className="h-8 w-8 text-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className={designSystem.card.base}>
              <CardHeader>
                <CardTitle className={designSystem.typography.cardTitle}>
                  <div className={designSystem.iconContainer.primary}>
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                  Daily Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Average Wait Time</span>
                    <span className="text-green-600 font-bold">{stats?.averageWaitTime || 0} minutes</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                    <span className="font-medium">Completion Rate</span>
                    <span className="text-emerald-600 font-bold">
                      {stats ? Math.round((stats.completed / stats.totalVisitors) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="font-medium">Peak Hours</span>
                    <span className="text-yellow-600 font-bold">2:00 PM - 4:00 PM</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={designSystem.card.base}>
              <CardHeader>
                <CardTitle className={designSystem.typography.cardTitle}>
                  <div className={designSystem.iconContainer.secondary}>
                    <Download className="h-6 w-6 text-emerald-600" />
                  </div>
                  Data Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className={designSystem.form.label}>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="date"
                        placeholder="Start date"
                        className={`pl-10 ${designSystem.form.input}`}
                        value={auditFilters.startDate}
                        onChange={(e) => setAuditFilters({...auditFilters, startDate: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="date"
                        placeholder="End date"
                        className={`pl-10 ${designSystem.form.input}`}
                        value={auditFilters.endDate}
                        onChange={(e) => setAuditFilters({...auditFilters, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleExportData}
                  className={`w-full justify-start ${designSystem.button.primary}`}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Visitor Data as CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-6">
          <Card className={designSystem.card.base}>
            <CardHeader>
              <CardTitle className={designSystem.typography.cardTitle}>
                <div className={designSystem.iconContainer.secondary}>
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
                Today&apos;s Visitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Consultant</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors.map((visitor) => (
                    <TableRow key={visitor._id}>
                      <TableCell className="font-mono">{visitor.tokenId}</TableCell>
                      <TableCell>{visitor.name}</TableCell>
                      <TableCell>{visitor.service}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(visitor.status)}>
                          {visitor.status.replace('-', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{visitor.assignedConsultant || '-'}</TableCell>
                      <TableCell>{new Date(visitor.createdAt).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card className={designSystem.card.base}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={designSystem.typography.cardTitle}>
                <div className={designSystem.iconContainer.primary}>
                  <Settings className="h-6 w-6 text-green-600" />
                </div>
                Service Management
              </CardTitle>
              <Button className={designSystem.button.primary}>
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Est. Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service._id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.description}</TableCell>
                      <TableCell>{service.estimatedTime} min</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(service.active ? 'active' : 'inactive')}>
                          {service.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card className={designSystem.card.base}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={designSystem.typography.cardTitle}>
                <div className={designSystem.iconContainer.secondary}>
                  <UserPlus className="h-6 w-6 text-emerald-600" />
                </div>
                Staff Management
              </CardTitle>
              <Button className={designSystem.button.primary}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff Member
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Today&apos;s Sessions</TableHead>
                    <TableHead>Current Queue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultants.map((consultant) => (
                    <TableRow key={consultant._id}>
                      <TableCell className="font-medium">{consultant.name}</TableCell>
                      <TableCell>{consultant.specialization.join(', ')}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(consultant.available ? 'available' : 'busy')}>
                          {consultant.available ? 'Available' : 'Busy'}
                        </Badge>
                      </TableCell>
                      <TableCell>{consultant.totalSessions}</TableCell>
                      <TableCell>{consultant.currentQueue}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card className={designSystem.card.base}>
            <CardHeader>
              <CardTitle className={designSystem.typography.cardTitle}>
                <div className={designSystem.iconContainer.primary}>
                  <Filter className="h-6 w-6 text-green-600" />
                </div>
                Audit Trail Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className={designSystem.form.label}>Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      className={`pl-10 ${designSystem.form.input}`}
                      value={auditFilters.startDate}
                      onChange={(e) => setAuditFilters({...auditFilters, startDate: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label className={designSystem.form.label}>End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      className={`pl-10 ${designSystem.form.input}`}
                      value={auditFilters.endDate}
                      onChange={(e) => setAuditFilters({...auditFilters, endDate: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label className={designSystem.form.label}>Entity Type</Label>
                  <Input
                    placeholder="e.g., visit"
                    className={designSystem.form.input}
                    value={auditFilters.entity}
                    onChange={(e) => setAuditFilters({...auditFilters, entity: e.target.value})}
                  />
                </div>
                <div>
                  <Label className={designSystem.form.label}>Entity ID</Label>
                  <Input
                    placeholder="e.g., 123"
                    className={designSystem.form.input}
                    value={auditFilters.entityId}
                    onChange={(e) => setAuditFilters({...auditFilters, entityId: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={loadAuditTrail} disabled={auditLoading} className={designSystem.button.primary}>
                <Search className="mr-2 h-4 w-4" />
                {auditLoading ? 'Loading...' : 'Load Audit Trail'}
              </Button>
            </CardContent>
          </Card>

          <Card className={designSystem.card.base}>
            <CardHeader>
              <CardTitle className={designSystem.typography.cardTitle}>
                <div className={designSystem.iconContainer.secondary}>
                  <Settings className="h-6 w-6 text-emerald-600" />
                </div>
                Audit Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500">
                          No audit records found. Apply filters and click &quot;Load Audit Trail&quot;.
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{new Date(record.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.entity} #{record.entityId}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${designSystem.badge.status.active}`}>{record.action}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{record.userName}</div>
                              <div className="text-gray-500 text-xs">{record.userRole}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs max-w-xs">
                              {record.newValues ? (
                                <pre className="bg-gray-100 p-2 rounded max-h-20 overflow-y-auto">
                                  {JSON.stringify(record.newValues, null, 2)}
                                </pre>
                              ) : (
                                <span className="text-gray-500">No details</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}