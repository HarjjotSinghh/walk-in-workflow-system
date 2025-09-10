import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { MapPin, Phone, Mail, Clock, Navigation } from "lucide-react"
import { Button } from "~/components/ui/button"

export function LocationContact() {
  const openMaps = () => {
    window.open('https://maps.google.com/?q=Ashok+Nagar+Jail+Road+New+Delhi', '_blank');
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Visit Our Office</h2>
          <p className="text-lg text-gray-600">
            Located in the heart of Ashok Nagar for your convenience
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="border-0 bg-card p-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                Office Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium text-gray-900">wiws CA Office</p>
                <p className="text-gray-600">
                  123, Jail Road, Ashok Nagar<br />
                  New Delhi - 110018<br />
                  India
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">info@wiws.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">Mon-Fri: 9AM-7PM, Sat: 9AM-5PM</span>
                </div>
              </div>

              <Button onClick={openMaps} className="w-full bg-green-600 hover:bg-green-700">
                <Navigation className="mr-2 h-4 w-4" />
                Get Directions
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card p-0">
            <CardHeader>
              <CardTitle>Nearby Landmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Ashok Nagar Metro Station</span>
                  <span className="text-sm text-green-600 font-medium">5 min walk</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">City Hospital</span>
                  <span className="text-sm text-green-600 font-medium">2 min walk</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Central Market</span>
                  <span className="text-sm text-green-600 font-medium">3 min walk</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Bus Stop (Route 52, 181)</span>
                  <span className="text-sm text-green-600 font-medium">1 min walk</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Parking Available</h4>
                <p className="text-sm text-green-700">
                  Free parking space available for visitors. Enter from the main gate.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}