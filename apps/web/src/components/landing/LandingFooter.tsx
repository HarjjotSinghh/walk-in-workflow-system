import { MapPin, Phone, Mail, Clock } from "lucide-react"

export function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-2xl font-bold text-green-400 mb-4">wiws</h3>
            <p className="text-gray-300 mb-4">
              Your trusted partner for tax, compliance, and business advisory services in New Delhi.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <MapPin className="h-4 w-4" />
                <span>Ashok Nagar, Jail Road, New Delhi</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Phone className="h-4 w-4" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Mail className="h-4 w-4" />
                <span>info@wiws.com</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-300">
              <li>ITR Filing</li>
              <li>GST Registration & Compliance</li>
              <li>Business Advisory</li>
              <li>Trademark Services</li>
              <li>Compliance & Litigation Support</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Office Hours</h4>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Monday - Friday: 9:00 AM - 7:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Saturday: 9:00 AM - 5:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Sunday: Closed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} wiws. All rights reserved. | Privacy Policy | Terms of Service
          </p>
        </div>
      </div>
    </footer>
  )
}