// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;

  // 노션 페이지 ID 패턴 감지 (GUID 형식)
  const notionPageIdPattern = /^\/([a-f0-9]{32})$/i;
  const notionPageMatch = path.match(notionPageIdPattern);

  if (notionPageMatch) {
    // 노션 페이지 ID를 감지하여 올바른 블로그 URL로 리디렉션
    const pageId = notionPageMatch[1];
    return NextResponse.redirect(new URL(`/blog/post-${pageId}`, request.url));
  }

  // 하위 페이지 패턴 감지 (/child-page/ID 형식)
  const childPagePattern = /^\/child-page\/([a-f0-9]{32})$/i;
  const childPageMatch = path.match(childPagePattern);

  if (childPageMatch) {    
    // 하위 페이지 ID를 감지하여 올바른 블로그 URL로 리디렉션
    const pageId = childPageMatch[1];
    return NextResponse.redirect(new URL(`/blog/post-${pageId}`, request.url));
  }

  return NextResponse.next();
}

// 특정 경로에만 미들웨어 적용
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
