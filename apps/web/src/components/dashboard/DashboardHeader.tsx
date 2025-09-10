import { Bell, LogOut, User, Settings, Mail, Phone, Webhook } from "lucide-react"
import { Button } from "~/components/ui/button"
import { useAuth } from "~/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { Badge } from "~/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
import { useState } from "react"
import { designSystem, getConnectionBadgeClass } from "~/lib/design-system"

export function DashboardHeader() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [notifications] = useState([
    {
      id: 1,
      title: "New visitor registered",
      message: "Rajesh Kumar has been registered for ITR Filing",
      time: "2 minutes ago",
      type: "info",
      unread: true
    },
    {
      id: 2,
      title: "Session completed",
      message: "Consultation with Priya Sharma completed successfully",
      time: "15 minutes ago",
      type: "success",
      unread: true
    },
    {
      id: 3,
      title: "Approval required",
      message: "New visitor waiting for PA approval",
      time: "30 minutes ago",
      type: "warning",
      unread: false
    }
  ])

  const unreadCount = notifications.filter(n => n.unread).length

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info': return '🔵'
      case 'success': return '✅'
      case 'warning': return '⚠️'
      default: return '📢'
    }
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            wiws
          </div>
          <Badge variant="secondary" className={designSystem.badge.role}>
            Dashboard
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={`relative hover:bg-green-50 ${designSystem.animation.transition}`}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs animate-pulse">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-96 bg-white">
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-green-600" />
                  Notifications
                </SheetTitle>
                <SheetDescription>
                  Stay updated with the latest activities
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card key={notification.id} className={`${designSystem.animation.transition} ${notification.unread ? `${designSystem.card.nested} border-green-200 bg-green-50/50` : `${designSystem.card.nested} border-gray-200`}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                            {notification.unread && (
                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{notification.message}</p>
                          <p className="text-xs text-gray-400">{notification.time}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" className="w-full">
                  View All Notifications
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* User Profile Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className={`hover:bg-green-50 ${designSystem.animation.transition}`}>
                <User className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  User Profile
                </DialogTitle>
                <DialogDescription>
                  Manage your account settings and preferences
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <Card className={`${designSystem.card.gradient}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl uppercase">
                        {user ? user.name.charAt(0) : 'U'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{user?.name ?? 'Unnamed User'}</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user?.email ?? 'unknown@email.com'}
                        </p>
                        <p className="text-sm text-gray-600 capitalize flex items-center gap-1">
                          <Webhook className="h-3 w-3" />
                          {user?.role ?? 'User'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <User className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>

                <Separator />

                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}