import type { Session } from '@supabase/supabase-js'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

if (!apiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL in .env')
}

export async function apiFetch<T>(
  path: string,
  session: Session | null,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = session?.access_token
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${apiBaseUrl}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let errorMessage = text
    try {
      if (text) {
        const json = JSON.parse(text)
        if (json.errors && typeof json.errors === 'object') {
          // Flatten all error arrays into a single message
          const allErrors = Object.values(json.errors).flat()
          if (allErrors.length > 0) {
            errorMessage = String(allErrors[0])
          }
        } else if (json.message) {
          errorMessage = String(json.message)
        } else if (json.title) {
          errorMessage = String(json.title)
        }
      }
    } catch {
      // Fallback to raw text if it's not JSON
    }
    throw new Error(errorMessage || `Request failed: ${res.status}`)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

export function getFriendlyErrorMessage(error: unknown, defaultMessage = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return defaultMessage;
  
  let rawMsg = '';
  if (error instanceof Error) {
    rawMsg = error.message;
  } else if (typeof error === 'string') {
    rawMsg = error;
  } else if (typeof error === 'object' && 'message' in error) {
    rawMsg = String((error as any).message);
  } else {
    return defaultMessage;
  }

  const msg = rawMsg.toLowerCase();
  
  // Database / Network / Schema issues
  if (
    msg.includes('database error querying schema') || 
    msg.includes('database error') || 
    msg.includes('relation') || 
    msg.includes('schema') || 
    msg.includes('constraint') ||
    msg.includes('postgres') ||
    msg.includes('sql')
  ) {
    return 'We are experiencing temporary database connection issues. Please try again in a few moments.';
  }
  if (
    msg.includes('failed to fetch') || 
    msg.includes('networkerror') || 
    msg.includes('load failed') ||
    msg.includes('typeerror: failed to fetch')
  ) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  // Authentication issues
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Incorrect email address or password. Please verify your details and try again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Your email address has not been verified yet. Please check your inbox for confirmation instructions.';
  }
  if (msg.includes('user already exists') || msg.includes('already registered')) {
    return 'An account with this email address already exists. Please log in instead.';
  }

  // Quiz-specific or API errors
  if (msg.includes('forbidden') || msg.includes('403') || msg.includes('permission')) {
    return 'You do not have permission to perform this action.';
  }
  if (msg.includes('not found') || msg.includes('404')) {
    return 'The requested resource could not be found.';
  }

  // If it's a simple, short custom validation error, return it capitalized.
  // Otherwise return the default message or capitalize the message.
  if (rawMsg.length > 100) {
    return defaultMessage;
  }
  return rawMsg.charAt(0).toUpperCase() + rawMsg.slice(1);
}


