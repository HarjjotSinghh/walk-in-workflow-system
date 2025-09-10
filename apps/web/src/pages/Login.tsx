import { useState } from "react"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router-dom"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "~/components/ui/card"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { useToast } from "~/hooks/useToast"
import {
  LogIn
  , LightbulbIcon,
  LightbulbOffIcon
} from "lucide-react"
import { useAuth } from "~/contexts/AuthContext"
import toast from "react-hot-toast"

type LoginForm = {
  email: string
  password: string
}

export function Login() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true)
      await login(data.email, data.password);
      toast.success(
        "Logged in successfully",
      )
      navigate(`${import.meta.env.VITE_BASE_URL}/dashboard`, {
        replace: true
      })
      window.location.href = `${import.meta.env.VITE_BASE_URL}/dashboard`
      return <Navigate to={`${import.meta.env.VITE_BASE_URL}/dashboard`} replace />
      // navigate("/dashboard", { replace: true })
    } catch (error: unknown) {
      console.error("Login error:", error instanceof Error ? error?.message : 'Unknown Login Error: ')
      toast.error(
        error instanceof Error ? error?.message : 'Unknown Login Error',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {/* <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900/50 p-4">
            <div className="flex items-center space-x-4">
              <LightbulbOffIcon className="h-6 w-6 text-yellow-500 dark:text-yellow-400 flex-shrink-0 stroke-[1.5]" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200 flex-1 min-w-0">
                You can use any email/password in the frontend phase
              </AlertDescription>
            </div>
          </Alert> */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email", { 
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Please enter a valid email address"
                  }
                })}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register("password", { 
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters"
                  }
                })}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                "Loading..."
              ) : (
                <>
                {/* elsint-disable-next-line */}
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="link"
            className="text-sm text-muted-foreground"
            onClick={() => navigate("/register")}
          >
            Don&apos;t have an account? Sign up
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
