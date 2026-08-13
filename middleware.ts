import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const auth = req.cookies.get('chantier_auth')?.value
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/chantier') && auth !== 'true') {
    return NextResponse.redirect(new URL('/', req.url))
  }
  if (pathname.startsWith('/api/tasks') && auth !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/chantier/:path*', '/api/tasks/:path*'],
}
