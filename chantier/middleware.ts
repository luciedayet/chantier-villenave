import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const auth = req.cookies.get('chantier_auth')?.value
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/chantier') && auth !== 'true') {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/chantier/:path*'],
}
