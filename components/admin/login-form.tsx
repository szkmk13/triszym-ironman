"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface LoginFormProps {
  onLogin: () => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [password, setPassword] = useState("")
  const router = useRouter()
  const passwordCheck = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password === passwordCheck) {
      onLogin()
      toast.success("Access granted")
    } else {
      toast.error("Invalid password")
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card>
        <Button variant="ghost" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="h-6 w-6" />
            Admin Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
