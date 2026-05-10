/**
 * NextAuth config — Pixeesite admin SaaS.
 *
 * Providers : Google OAuth + Credentials (email + password bcrypt).
 * Session : JWT 30j avec userId + orgs (memberships) + currentOrgSlug.
 */
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { compare, hash } from 'bcryptjs';
import { platformDb } from '@pixeesite/database';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login', signOut: '/login', error: '/login' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Email + password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await platformDb.user.findUnique({ where: { email: creds.email } });
        if (!user || !user.passwordHash) return null;
        const ok = await compare(creds.password, user.passwordHash);
        if (!ok) return null;
        if (user.banned) return null;
        await platformDb.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, email: user.email, name: user.name || undefined };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        await platformDb.user.upsert({
          where: { email: user.email },
          update: { lastLoginAt: new Date(), name: user.name, avatarUrl: user.image },
          create: { email: user.email, name: user.name, avatarUrl: user.image, emailVerified: new Date() },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await platformDb.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            memberships: {
              select: {
                role: true,
                org: { select: { slug: true, name: true, plan: true } },
              },
            },
          },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.orgs = dbUser.memberships.map((m) => ({
            slug: m.org.slug,
            name: m.org.name,
            plan: m.org.plan,
            role: m.role,
          }));
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).orgs = token.orgs || [];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 10);
}
