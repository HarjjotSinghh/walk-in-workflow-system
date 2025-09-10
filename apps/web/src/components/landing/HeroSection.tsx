import { Button } from "~/components/ui/button"
import { ArrowRight, Calendar, Users } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function HeroSection() {
  const navigate = useNavigate();

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-form');
    contactSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Tax, Compliance & Advisory—
                <span className="text-green-600">Done Right</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Professional CA services with walk-in consultations at our Ashok Nagar office.
                Expert guidance for all your tax, compliance, and business advisory needs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg transition-all duration-150"
                  onClick={scrollToContact}
                >
                <Calendar className="mr-2 h-5 w-5" />
                Book a Consultation
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 rounded-lg transition-all duration-300"
                onClick={() => navigate('/dashboard')}
              >
                <Users className="mr-2 h-5 w-5" />
                Walk-In Welcome
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center space-x-8 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">500+</div>
                <div className="text-sm text-gray-600">Happy Clients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">15+</div>
                <div className="text-sm text-gray-600">Years Experience</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">24/7</div>
                <div className="text-sm text-gray-600">Support</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl p-8">
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Office Hours</span>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">Open</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monday - Friday</span>
                      <span className="font-medium">9:00 AM - 7:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday</span>
                      <span className="font-medium">9:00 AM - 5:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday</span>
                      <span className="text-red-600">Closed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}