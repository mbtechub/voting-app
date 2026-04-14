// voting_frontend/lib/env.ts

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Strict backend base (server-side only usage)
 */
export const BACKEND_BASE_URL = requireEnv('BACKEND_BASE_URL');

/**
 * Safe backend base for route handlers.
 * Falls back to BACKEND_BASE_URL if NEXT_PUBLIC_API_BASE_URL is not defined.
 */
export const backendBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  BACKEND_BASE_URL;
