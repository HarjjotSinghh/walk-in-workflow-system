import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { useForm } from "react-hook-form"
import { useState, useEffect } from "react"
import { createAppointment } from "~/api/appointments"
import { getServices, Service } from "~/api/services"
import { useToast } from "~/hooks/useToast"
import { Calendar, Send } from "lucide-react"
import toast from "react-hot-toast"

interface FormData {
  name: string;
  phone: string;
  email: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
}

export function ContactForm() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await getServices() as { services: Service[] };
        setServices(response.services);
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };

    fetchServices();
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      console.log('Submitting appointment request:', data);
      const response = await createAppointment(data) as { success: boolean; message: string };
      
      if (response.success) {
        toast.success(response.message ?? 'Appointment request submitted successfully');
        reset();
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error(
        "Failed to submit appointment request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact-form" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Book Your Consultation</h2>
          <p className="text-lg text-gray-600">
            Schedule an appointment or visit us for walk-in consultations
          </p>
        </div>

  <Card className="border-0 bg-card/80">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Calendar className="h-6 w-6 text-green-600" />
              Appointment Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    {...register("name", { required: "Name is required" })}
                    placeholder="Enter your full name"
                    className="h-12"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    {...register("phone", { 
                      required: "Phone number is required",
                      pattern: {
                        value: /^[0-9]{10}$/,
                        message: "Please enter a valid 10-digit phone number"
                      }
                    })}
                    placeholder="Enter your phone number"
                    className="h-12"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", { 
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Please enter a valid email address"
                    }
                  })}
                  placeholder="Enter your email address"
                  className="h-12"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="service">Service Required *</Label>
                <Select onValueChange={(value) => setValue("service", value)}>
                  <SelectTrigger className="h-12 border border-border bg-card px-3">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service._id} value={service.name}>
                        {service.name} ({service.estimatedTime} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.service && (
                  <p className="text-sm text-red-600">{errors.service.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="preferredDate">Preferred Date *</Label>
                  <Input
                    id="preferredDate"
                    type="date"
                    {...register("preferredDate", { required: "Preferred date is required" })}
                    min={new Date().toISOString().split('T')[0]}
                    className="h-12"
                  />
                  {errors.preferredDate && (
                    <p className="text-sm text-red-600">{errors.preferredDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredTime">Preferred Time *</Label>
                  <Select onValueChange={(value) => setValue("preferredTime", value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="11:00">11:00 AM</SelectItem>
                      <SelectItem value="12:00">12:00 PM</SelectItem>
                      <SelectItem value="14:00">2:00 PM</SelectItem>
                      <SelectItem value="15:00">3:00 PM</SelectItem>
                      <SelectItem value="16:00">4:00 PM</SelectItem>
                      <SelectItem value="17:00">5:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.preferredTime && (
                    <p className="text-sm text-red-600">{errors.preferredTime.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Additional Message</Label>
                <Textarea
                  id="message"
                  {...register("message")}
                  placeholder="Any specific requirements or questions?"
                  className="min-h-[100px]"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                {loading ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Appointment Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}