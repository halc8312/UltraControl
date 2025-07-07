import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        accessToken: { label: "Access Token", type: "text" },
        refreshToken: { label: "Refresh Token", type: "text" },
        isGuest: { label: "Is Guest", type: "boolean" }
      },
      async authorize(credentials) {
        // Handle guest login (has accessToken and refreshToken)
        if (credentials?.accessToken && credentials?.refreshToken) {
          try {
            // Get user info using the provided access token
            const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
              headers: {
                Authorization: `Bearer ${credentials.accessToken}`,
              },
            });

            if (!userRes.ok) {
              return null;
            }

            const user = await userRes.json();

            return {
              id: user.id,
              email: user.email,
              name: user.full_name || user.username,
              image: user.avatar_url,
              accessToken: credentials.accessToken,
              refreshToken: credentials.refreshToken,
              isGuest: true,
            };
          } catch (error) {
            console.error('Guest auth error:', error);
            return null;
          }
        }
        
        // Handle regular email/password login
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call our backend API to authenticate
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/signin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              username: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            return null;
          }

          const data = await res.json();

          // Get user info
          const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${data.access_token}`,
            },
          });

          if (!userRes.ok) {
            return null;
          }

          const user = await userRes.json();

          return {
            id: user.id,
            email: user.email,
            name: user.full_name || user.username,
            image: user.avatar_url,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isGuest: false,
          };
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        // For guest login, we already have the tokens
        if (account.provider === 'credentials' && user.isGuest) {
          token.accessToken = user.accessToken;
          token.refreshToken = user.refreshToken;
          token.isGuest = true;
        }
        // For Google OAuth, we already handle this in the authorize callback
        else if (account.provider === 'google') {
          // Keep the existing Google OAuth logic
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/oauth/google`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token: account.id_token,
                user: {
                  email: user.email,
                  name: user.name,
                  image: user.image,
                  google_id: user.id,
                },
              }),
            });

            if (res.ok) {
              const data = await res.json();
              token.accessToken = data.access_token;
              token.refreshToken = data.refresh_token;
              token.isGuest = false;
            }
          } catch (error) {
            console.error('Google OAuth error:', error);
          }
        }
        
        // Set user data
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        token.subscription_plan = user.subscription_plan;
      }
      return token;
    },
    async session({ session, token }) {
      // Add the access token to the session
      if (token) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string | null | undefined;
        session.user.subscription_plan = token.subscription_plan as 'free' | 'pro' | undefined;
        session.user.isGuest = token.isGuest as boolean | undefined;
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/auth/signup"
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }