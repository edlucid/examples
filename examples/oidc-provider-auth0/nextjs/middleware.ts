import type { NextRequest } from "next/server";
import { NextResponse } from 'next/server';
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  // Let Next.js internals pass through
  if (request.nextUrl.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }
  return await auth0.middleware(request);
}

// By default, the middleware runs on all paths. 
// If you want to limit it, you can use a matcher:
// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      */
//     '/((?!api|_next/static|_next/image|favicon.ico).*)',
//   ],
// }; 