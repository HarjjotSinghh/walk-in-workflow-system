import { Card, CardContent } from "~/components/ui/card"
import { Award, Users, Clock, Shield, Star, CheckCircle } from "lucide-react"

export function WhyChooseUs() {
  const features = [
    {
      icon: Award,
      title: "15+ Years Experience",
      description: "Proven track record in tax and compliance services"
    },
    {
      icon: Users,
      title: "Expert Team",
      description: "Certified CAs and tax professionals at your service"
    },
    {
      icon: Clock,
      title: "Quick Turnaround",
      description: "Fast and efficient service delivery"
    },
    {
      icon: Shield,
      title: "100% Compliance",
      description: "Ensuring full regulatory compliance"
    },
    {
      icon: Star,
      title: "500+ Happy Clients",
      description: "Trusted by businesses across Delhi NCR"
    },
    {
      icon: CheckCircle,
      title: "Transparent Process",
      description: "Clear communication and no hidden charges"
    }
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose wiws?</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your trusted partner for all tax, compliance, and business advisory needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            
            return (
        <Card key={index} className="group transition-all duration-150 border border-border bg-card">
                <CardContent className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-150">
                    <IconComponent className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Professional Certifications</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold">ICAI</div>
              <div className="text-green-100">Certified Members</div>
            </div>
            <div>
              <div className="text-3xl font-bold">ISO</div>
              <div className="text-green-100">Quality Certified</div>
            </div>
            <div>
              <div className="text-3xl font-bold">GST</div>
              <div className="text-green-100">Authorized Practitioners</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}