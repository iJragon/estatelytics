import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth redirects are handled in server components (app/page.tsx, app/dashboard/page.tsx)
// which run in Node.js runtime and have full Supabase SSR support.
// This middleware is a simple passthrough to avoid Edge runtime compatibility issues.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
