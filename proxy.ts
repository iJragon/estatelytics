import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth redirects are handled in individual server components.
// This proxy is a simple passthrough.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
