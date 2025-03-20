// pages/api/notion-file.js
export const runtime = 'edge';

export default async function handler(request) {
  // URL 객체에서 쿼리 파라미터 파싱
  const url = new URL(request.url);
  const fileId = url.searchParams.get('fileId');
  const pageId = url.searchParams.get('pageId');

  if (!fileId || !pageId) {
    return new Response(
      JSON.stringify({ error: '파일 ID 또는 페이지 ID가 누락되었습니다' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  console.log('파일 다운로드 요청:', { fileId, pageId });

  try {
    // 노션 API 클라이언트 초기화 (엣지 환경에서 동적 생성)
    const { NotionAPI } = await import('notion-client');
    const notion = new NotionAPI({
      authToken: process.env.NOTION_TOKEN_V2
    });

    // 노션 페이지 데이터 가져오기
    const recordMap = await notion.getPage(pageId);
    console.log('페이지 데이터 가져옴');

    // 서명된 URL 찾기
    let fileUrl = null;
    
    // 1. recordMap.signed_urls에서 찾기
    if (recordMap.signed_urls && recordMap.signed_urls[fileId]) {
      fileUrl = recordMap.signed_urls[fileId];
      console.log('서명된 URL 찾음:', fileUrl);
    } 
    // 2. 블록에서 직접 찾기
    else {
      console.log('서명된 URL을 찾지 못함, 블록에서 직접 찾기 시도');
      
      const blocks = Object.values(recordMap.block || {});
      for (const block of blocks) {
        const blockId = block.value?.id;
        
        // 현재 블록이 대상 파일인지 확인
        if (blockId === fileId) {
          // 소스 URL 확인
          const source = block.value?.properties?.source?.[0]?.[0];
          if (source && !source.startsWith('attachment:')) {
            fileUrl = source;
            console.log('블록에서 URL 찾음:', fileUrl);
            break;
          }
        }
        
        // 파일 ID가 포함된 블록인지 확인
        if (block.value?.file_ids && block.value.file_ids.includes(fileId)) {
          const file = block.value?.files?.find(f => f.id === fileId);
          if (file && file.url) {
            fileUrl = file.url;
            console.log('파일 ID에서 URL 찾음:', fileUrl);
            break;
          }
        }
      }
    }

    // 서명된 URL을 찾지 못한 경우
    if (!fileUrl) {
      console.log('유효한 파일 URL을 찾지 못함');
      return new Response(
        JSON.stringify({ error: '파일을 찾을 수 없습니다' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 파일 다운로드 및 응답
    console.log('파일 다운로드 시도:', fileUrl);
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`파일 다운로드 실패: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // 응답 헤더 설정과 데이터 전송
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileId)}.pdf"`,
        'Content-Length': arrayBuffer.byteLength.toString()
      }
    });
    
  } catch (error) {
    console.error('파일 다운로드 오류:', error);
    return new Response(
      JSON.stringify({ error: '내부 서버 오류', message: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
