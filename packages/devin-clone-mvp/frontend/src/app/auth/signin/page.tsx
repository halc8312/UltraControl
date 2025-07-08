"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User } from "lucide-react"
import { apiClient } from "@/lib/api-client"

function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <SignInForm />
      </Suspense>
    </div>
  )
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isGuestLoading, setIsGuestLoading] = useState(false)

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: "エラー",
          description: "メールアドレスまたはパスワードが正しくありません",
          variant: "destructive",
        })
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "サインインに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    try {
      await signIn("google", { callbackUrl })
    } catch (error) {
      toast({
        title: "エラー",
        description: "Googleサインインに失敗しました",
        variant: "destructive",
      })
      setIsGoogleLoading(false)
    }
  }

  async function handleGuestLogin() {
    console.log('🚀 Starting guest login process...')
    setIsGuestLoading(true)
    
    try {
      // Call the guest login API endpoint
      console.log('📡 Calling guest login API endpoint...')
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('📊 Guest login response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Guest login failed:', errorText)
        throw new Error(`Guest login failed: ${response.status} ${response.statusText}`)
      }

      const responseData = await response.json()
      console.log('✅ Guest login successful:', responseData)
      
      // Direct redirect to dashboard for guest users
      console.log('🔄 Redirecting to dashboard...')
      window.location.href = '/dashboard'
      
    } catch (error) {
      console.error('💥 Guest login error:', error)
      toast({
        title: "エラー",
        description: `ゲストログインに失敗しました: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsGuestLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">サインイン</CardTitle>
        <CardDescription className="text-center">
          アカウントにサインインしてください
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Guest Login Button - Moved to top */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGuestLogin}
          disabled={isGuestLoading}
        >
          {isGuestLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              接続中...
            </>
          ) : (
            <>
              <User className="mr-2 h-4 w-4" />
              ゲストとして続ける
            </>
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              またはメールでサインイン
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              disabled={isLoading}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">パスワード</Label>
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                パスワードをお忘れですか？
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading}
              className="w-full"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                サインイン中...
              </>
            ) : (
              "サインイン"
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              または
            </span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              接続中...
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Googleでサインイン
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <div className="text-center text-sm">
          アカウントをお持ちでない方は{" "}
          <Link href="/auth/signup" className="underline">
            サインアップ
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

export default function SignInPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInPage />
    </Suspense>
  )
}