import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/ui/theme-provider"
import { Toaster } from "react-hot-toast"
import { AuthProvider } from "./contexts/AuthContext"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { BlankPage } from "./pages/BlankPage"
import { LandingPage } from "./pages/LandingPage"
import { DashboardLayout } from "./components/DashboardLayout"
import { DynamicDashboard } from "./components/DynamicDashboard"
import { ReceptionistDashboard } from "./pages/dashboard/ReceptionistDashboard"
import { PADashboard } from "./pages/dashboard/PADashboard"
import { ConsultantDashboard } from "./pages/dashboard/ConsultantDashboard"
import { AdminDashboard } from "./pages/dashboard/AdminDashboard"
import { AuthDebugger } from "./components/AuthDebugger"

function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/debug" element={<AuthDebugger />} />
            
            {/* Dashboard Routes - Single route with nested structure */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout />
             </ProtectedRoute>
            }>
              <Route index element={<DynamicDashboard />} />
              <Route path="receptionist" element={
                <ProtectedRoute allowedRoles={['reception', 'admin']}>
                  <ReceptionistDashboard />
                </ProtectedRoute>
              } />
              <Route path="pa" element={
                <ProtectedRoute allowedRoles={['pa', 'admin']}>
                  <PADashboard />
                </ProtectedRoute>
              } />
              <Route path="consultant" element={
                <ProtectedRoute allowedRoles={['consultant', 'admin']}>
                  <ConsultantDashboard />
                </ProtectedRoute>
              } />
              <Route path="admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* 404 Route */}
            <Route path="*" element={<BlankPage />} />
          </Routes>
        </Router>
        <Toaster position="bottom-right" />
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App