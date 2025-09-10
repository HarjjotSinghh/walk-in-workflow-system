import { Outlet } from "react-router-dom"
import { DashboardHeader } from "./dashboard/DashboardHeader"
import { DashboardSidebar } from "./dashboard/DashboardSidebar"
import { cn } from "~/lib/utils"

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <DashboardHeader /> 
      <div className="flex pt-16">
        {import.meta.env.DEV && <DashboardSidebar />}
        <main className={cn("flex-1 overflow-y-auto p-8 h-full", import.meta.env.DEV && "ml-96")}>
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}