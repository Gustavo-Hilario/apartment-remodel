import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

/**
 * NextAuth Configuration
 *
 * Handles authentication with credentials (email/password)
 * Connects to MongoDB via backend API
 */

// MongoDB connection via backend API
const API_URL = process.env.NEXT_PUBLIC_API_URL.replace('/api', '');

async function getUserByEmail(email) {
    try {
        const response = await fetch(`${API_URL}/api/auth/user-by-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Please enter your email and password');
                }

                // Get user from database
                const user = await getUserByEmail(credentials.email);

                if (!user) {
                    throw new Error('No user found with this email');
                }

                if (!user.isActive) {
                    throw new Error('Your account has been deactivated');
                }

                // Check if password exists
                if (!user.password) {
                    throw new Error('Account configuration error. Please contact support.');
                }

                // Verify password
                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    throw new Error('Invalid password');
                }

                // Update last login via API
                await fetch(`${API_URL}/api/auth/update-last-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user._id }),
                });

                // Return user object (will be stored in JWT)
                return {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Add user info to token on sign in
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            // Add user info to session
            if (token) {
                session.user.id = token.id;
                session.user.email = token.email;
                session.user.name = token.name;
                session.user.role = token.role;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        signOut: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
