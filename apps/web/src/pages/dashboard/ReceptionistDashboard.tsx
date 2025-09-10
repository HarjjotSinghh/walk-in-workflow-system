import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Textarea } from "~/components/ui/textarea"
import { Badge } from "~/components/ui/badge"
import { useForm } from "react-hook-form"
import { Plus, Users, Clock, CheckCircle, AlertCircle, Phone, User as UserIcon, Wifi, WifiOff } from "lucide-react"
import { getTodayVisitors, createVisitor, Visitor } from "~/api/visitors"
import { getServices, Service } from "~/api/services"
import { useSSE } from "~/hooks/useSSE"
import { useAuth } from "~/contexts/AuthContext"
import toast from "react-hot-toast"
import { designSystem, getStatusBadgeClass, getConnectionBadgeClass } from "~/lib/design-system"

interface NewVisitorForm {
  name: string;
  phone: string;
  service: string;
  notes: string;
}

export function ReceptionistDashboard() {
  const { user } = useAuth();
  const { connection, lastEvent } = useSSE();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<NewVisitorForm>();

  useEffect(() => {
    fetchData();
  }, [lastEvent]); // Refetch data when SSE events occur

  const fetchData = async () => {
    try {
      // console.log('Fetching receptionist dashboard data');
      const [visitorsResponse, servicesResponse] = await Promise.all([
        getTodayVisitors() as Promise<{ visitors: Visitor[] }>,
        getServices() as Promise<{ services: Service[] }>
      ]);

      setVisitors(visitorsResponse.visitors);
      setServices(servicesResponse.services);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(
        "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: NewVisitorForm) => {
    setSubmitting(true);
    try {
      // console.log('Creating new visitor:', data);
      const response = await createVisitor({
        name: data.name,
        phone: data.phone,
        serviceId: Number(data.service),
        notes: data.notes
      }) as { visitor: Visitor; success: boolean; message: string };

      if (response.success) {
        setVisitors(prev => [response.visitor, ...prev]);
        reset();
        toast.success(
          `Token ${response.visitor.tokenId} created successfully`,
        );
      }
    } catch (error) {
      console.error('Error creating visitor:', error);
      toast.error(
        "Failed to create visitor token",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertCircle className="h-4 w-4" />;
      case 'approved': return <Clock className="h-4 w-4" />;
      case 'in-session': return <Users className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className={designSystem.layout.container}>
        <div className="flex items-center justify-between">
          <h1 className={designSystem.typography.pageTitle}>Receptionist Dashboard</h1>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${designSystem.loading.skeleton}`}></div>
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className={designSystem.loading.card}>
            <div className={`h-6 ${designSystem.loading.skeleton} mb-6`}></div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-12 ${designSystem.loading.skeleton}`}></div>
              ))}
            </div>
          </div>
          <div className={designSystem.loading.card}>
            <div className={`h-6 ${designSystem.loading.skeleton} mb-6`}></div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-20 ${designSystem.loading.skeleton}`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={designSystem.layout.container}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={designSystem.typography.pageTitle}>
            Receptionist Dashboard
          </h1>
          <p className={designSystem.typography.pageSubtitle}>Manage visitor registration and queue status</p>
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
            {visitors.length} Visitors Today
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className={designSystem.card.base}>
          <CardHeader className="pb-6">
            <CardTitle className={designSystem.typography.cardTitle}>
              <div className={designSystem.iconContainer.primary}>
                <Plus className="h-6 w-6 text-green-600" />
              </div>
              New Visitor Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className={designSystem.form.label}>Visitor Name *</Label>
                <Input
                  id="name"
                  {...register("name", { required: "Name is required" })}
                  placeholder="Enter visitor's full name"
                  className={designSystem.form.input}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className={designSystem.form.label}>Phone Number *</Label>
                <Input
                  id="phone"
                  {...register("phone", {
                    required: "Phone number is required",
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: "Please enter a valid 10-digit phone number"
                    }
                  })}
                  placeholder="Enter 10-digit phone number"
                  className={designSystem.form.input}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="service" className={designSystem.form.label}>Service Required *</Label>
                <Select onValueChange={(value) => setValue("service", value)}>
                  <SelectTrigger className={designSystem.form.select}>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service._id} value={service._id}>
                        {service.name} ({service.estimatedTime} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.service && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.service.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="notes" className={designSystem.form.label}>Special Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Any special requirements or notes"
                  className={`min-h-[100px] ${designSystem.form.textarea}`}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className={`w-full h-14 font-medium text-lg ${designSystem.button.primary}`}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className={designSystem.loading.spinner}></div>
                    Creating Token...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create Token
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className={designSystem.card.base}>
          <CardHeader className="pb-6">
            <CardTitle className={designSystem.typography.cardTitle}>
              <div className={designSystem.iconContainer.secondary}>
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              Current Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {visitors.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">No visitors registered today</p>
                </div>
              ) : (
                visitors.map((visitor) => (
                  <Card key={visitor._id} className={designSystem.card.nested}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-lg px-3 py-1 border-2">
                            {visitor.tokenId}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{visitor.name}</span>
                          </div>
                        </div>
                        <Badge className={getStatusBadgeClass(visitor.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(visitor.status)}
                            {visitor.status.replace('-', ' ').toUpperCase()}
                          </div>
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Service:</span>
                          <span>{visitor.service}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{visitor.phone}</span>
                        </div>
                        {visitor.waitTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>Wait Time: {visitor.waitTime} minutes</span>
                          </div>
                        )}
                        {visitor.assignedConsultant && (
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-3 w-3" />
                            <span>Consultant: {visitor.assignedConsultant}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}