"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { Suspense } from 'react'

function ErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: { [key: string]: string } = {
    OAuthSignin: 'サインイン中にエラーが発生しました。もう一度お試しください。',
    OAuthCallback: 'コールバック中にエラーが発生しました。もう一度お試しください。',
    OAuthCreateAccount: 'アカウント作成中にエラーが発生しました。もう一度お試しください。',
    EmailCreateAccount: 'アカウント作成中にエラーが発生しました。もう一度お試しください。',
    Callback: 'コールバック中にエラーが発生しました。もう一度お試しください。',
    OAuthAccountNotLinked: 'このメールアドレスは既に他のアカウントと連携されています。別のサインイン方法をお試しください。',
    EmailSignin: 'メールアドレスの形式が正しくありません。',
    CredentialsSignin: 'メールアドレスまたはパスワードが正しくありません。',
    default: '不明なエラーが発生しました。',
  }

  const message = error ? errorMessages[error] || errorMessages.default : errorMessages.default

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive">サインインエラー</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{message}</p>
        </CardContent>
        <CardFooter>
          <Link href="/auth/signin" className="w-full">
            <Button variant="outline" className="w-full">サインインページに戻る</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function ErrorPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorPage />
    </Suspense>
  )
}