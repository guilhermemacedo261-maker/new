import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, readSignedToken } from '@/lib/utils/auth';

// Protege /admin (paginas) e /api/admin (rotas) - so quem tem o cookie
// assinado de admin (definido em /api/admin/login) passa. Isso impede
// que um usuario comum altere jogos/participantes ou veja o painel
// (secao 18, itens "alterar jogos", "alterar participantes", "acessar
// o painel administrativo").
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin') && pathname !== '/api/admin/login';

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const value = await readSignedToken(cookie);

  if (value !== 'admin') {
    if (isAdminApi) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
