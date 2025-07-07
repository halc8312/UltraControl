"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  Code2, 
  LogOut, 
  User,
  CreditCard,
  Settings,
  Menu
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Code2 className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Devin Clone
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {session && (
              <>
                <Link
                  href="/projects"
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  プロジェクト
                </Link>
                <Link
                  href="/docs"
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  ドキュメント
                </Link>
              </>
            )}
          </nav>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : session ? (
            <>
              <Badge variant="outline" className="hidden sm:flex">
                {session.user.subscription_plan === "pro" ? "Pro" : "Free"}
              </Badge>
              
              {/* Desktop User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full hidden md:flex">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                      <AvatarFallback>
                        {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>プロフィール</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/billing">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>料金プラン</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>設定</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ログアウト</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">メニューを開く</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>メニュー</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col space-y-4 mt-6">
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                        <AvatarFallback>
                          {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">{session.user.name}</p>
                        <p className="text-xs text-muted-foreground">{session.user.email}</p>
                        <Badge variant="outline" className="w-fit mt-1">
                          {session.user.subscription_plan === "pro" ? "Pro" : "Free"}
                        </Badge>
                      </div>
                    </div>
                    
                    <nav className="flex flex-col space-y-2">
                      <Link
                        href="/projects"
                        className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Code2 className="h-4 w-4" />
                        <span>プロジェクト</span>
                      </Link>
                      <Link
                        href="/docs"
                        className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <User className="h-4 w-4" />
                        <span>ドキュメント</span>
                      </Link>
                      <Link
                        href="/settings/profile"
                        className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <User className="h-4 w-4" />
                        <span>プロフィール</span>
                      </Link>
                      <Link
                        href="/settings/billing"
                        className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>料金プラン</span>
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>設定</span>
                      </Link>
                    </nav>
                    
                    <div className="pt-4 border-t">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-destructive"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>ログアウト</span>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">ログイン</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">新規登録</Link>
              </Button>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Link href="/auth/signin">
                  <User className="h-4 w-4" />
                  <span className="sr-only">ログイン</span>
                </Link>
              </Button>
            </div>
          )}
          
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}