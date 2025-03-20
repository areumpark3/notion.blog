// pages/api/notion-file.js
import { NotionAPI } from 'notion-client';
import fetch from 'node-fetch';

export const runtime = 'edge';

// 노션 API 클라이언트 초기화
const notion = new NotionAPI({
  authToken: process.env.NOTION_TOKEN_V2
});

export default async function handler(req, res) {
  const { fileId, pageId } = req.query;

  if (!fileId || !pageId) {
    return res.status(400).json({ error: '파일 ID 또는 페이지 ID가 누락되었습니다' });
  }

  console.log('파일 다운로드 요청:', { fileId, pageId });

  try {
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
      return res.status(404).json({ error: '파일을 찾을 수 없습니다' });
    }

    // 파일 다운로드 및 응답
    console.log('파일 다운로드 시도:', fileUrl);
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`파일 다운로드 실패: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    
    // 응답 헤더 설정
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileId)}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    
    // 파일 데이터 전송
    res.status(200).send(buffer);
    
  } catch (error) {
    console.error('파일 다운로드 오류:', error);
    res.status(500).json({ error: '내부 서버 오류', message: error.message });
  }
}
