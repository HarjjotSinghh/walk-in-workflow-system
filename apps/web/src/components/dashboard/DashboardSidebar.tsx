import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Card, CardContent } from "~/components/ui/card"
import {
  Users,
  UserCheck,
  Stethoscope,
  Settings,
  BarChart3,
  Home,
  Clock,
  CheckCircle,
  User,
  Shield
} from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useState } from "react"
import { useAuth } from "~/contexts/AuthContext"
import { designSystem } from "~/lib/design-system"

export function DashboardSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const {user} = useAuth();
  const [currentRole, setCurrentRole] = useState(() => {
    const path = location.pathname.split('/').pop()
    return path || 'reception'
  })

  const menuItems = [
    {
      title: "Receptionist",
      icon: Users,
      path: "/dashboard/receptionist",
      description: "Visitor registration & queue",
      role: "receptionist"
    },
    {
      title: "Personal Assistant",
      icon: UserCheck,
      path: "/dashboard/pa",
      description: "Approval & assignment",
      role: "pa"
    },
    {
      title: "Consultant",
      icon: Stethoscope,
      path: "/dashboard/consultant",
      description: "Session management",
      role: "consultant"
    },
    {
      title: "Admin",
      icon: Settings,
      path: "/dashboard/admin",
      description: "System management",
      role: "admin"
    }
  ]

  const quickStats = [
    { label: "In Queue", value: "5", icon: Clock, color: "text-yellow-600", bgColor: "bg-yellow-50" },
    { label: "In Session", value: "2", icon: Users, color: "text-green-600", bgColor: "bg-green-50" },
    { label: "Completed", value: "18", icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50" }
  ]

  const handleRoleChange = (newRole: string) => {
    setCurrentRole(newRole)
    navigate(`/dashboard/${newRole}`)
  }

  const getCurrentRoleInfo = () => {
    return menuItems.find(item => item.role === currentRole) || menuItems[0]
  }

  const roleInfo = getCurrentRoleInfo()

  return (
    <div className={cn("fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card/95 backdrop-blur-sm border-r border-border overflow-y-auto", import.meta.env.DEV && "w-96")}>
      <div className="p-6 space-y-6">
        <Button
          variant="ghost"
          className={`w-full justify-start hover:bg-green-50 ${designSystem.animation.transition}`}
          onClick={() => navigate("/")}
        >
          <Home className="mr-2 h-4 w-4" />
          Back Home
        </Button>

        {/* Current Role Display */}
        <Card className={designSystem.card.gradient}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-card rounded-xl border border-border">
                <roleInfo.icon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Current Role</div>
                <Badge className={designSystem.button.primary}>
                  {roleInfo.title}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{roleInfo.description}</p>
          </CardContent>
        </Card>

        {/* Role Switcher for Testing */}
        <div className="space-y-3">
          <label className={designSystem.typography.sectionTitle}>
            Switch Role (Testing)
          </label>
          <Select value={currentRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-full h-11 bg-card border border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {menuItems.map((item) => (
                <SelectItem key={item.role} value={item.role}>
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <h3 className={designSystem.typography.sectionTitle}>
            Dashboard Navigation
          </h3>
          <div className="space-y-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon
              const isActive = location.pathname === item.path

              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    `w-full justify-start h-auto p-4 ${designSystem.animation.transition}`,
                    isActive 
                      ? designSystem.button.primary
                      : "hover:bg-green-50"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <div className="flex items-start space-x-3">
                    <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className={cn(
                        "text-xs mt-1",
                        isActive ? "text-green-100" : "text-gray-500"
                      )}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className={designSystem.typography.sectionTitle}>
            Quick Stats
          </h3>
          <div className="space-y-3">
            {quickStats.map((stat) => {
              const IconComponent = stat.icon
              return (
                <Card key={stat.label} className={`${designSystem.card.nested} ${designSystem.animation.transition}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                          <IconComponent className={cn("h-4 w-4", stat.color)} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{stat.value}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* User Profile Section */}
        <Card className={designSystem.card.elevated}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-card rounded-full border border-border">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{user?.name ?? 'Unnamed User'}</div>
                <div className="text-xs text-gray-500">{user?.email ?? 'unnamed@email.com'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}