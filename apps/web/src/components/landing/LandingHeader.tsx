import { Button } from "~/components/ui/button"
import { Phone, MapPin } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function LandingHeader() {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold text-green-600">wiws</div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>Ashok Nagar, New Delhi</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>+91 98765 43210</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/login')}
            >
              Staff Login
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}