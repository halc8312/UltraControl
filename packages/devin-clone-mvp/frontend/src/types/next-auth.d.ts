import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      subscription_plan?: "free" | "pro"
      isGuest?: boolean
    }
    accessToken: string
    refreshToken?: string
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    subscription_plan?: "free" | "pro"
    accessToken?: string
    refreshToken?: string
    isGuest?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string
    subscription_plan?: "free" | "pro"
    accessToken?: string
    refreshToken?: string
    isGuest?: boolean
  }
}

// Extend the built-in session types
declare module "next-auth/next" {
  interface NextAuthOptions {
    callbacks?: {
      jwt?: (params: { token: JWT; user?: User; account?: any; profile?: any; isNewUser?: boolean }) => any
      session?: (params: { session: Session; token: JWT; user: User }) => any
    }
  }
}

// Extend the credentials provider types
declare module "next-auth/providers/credentials" {
  interface CredentialInput {
    email?: string
    password?: string
    accessToken?: string
    refreshToken?: string
    isGuest?: boolean
  }
}
}