// app/guide/page.tsx
import { en } from 'content/guide';
import NotionRenderer from 'components/notion-renderer';
import { NotionAPI } from 'notion-client';

export default async function GuidePage() {
  try {
    // 방법 1: 간단한 콘텐츠 렌더링 (빌드 오류 해결용)
    return <NotionRenderer content={en.content} />;
    
    // 아래 코드는 필요시 주석 해제
    /*
    // 방법 2: Notion API 사용
    if (en.notionPageId) {
      const notion = new NotionAPI({
        authToken: process.env.NOTION_TOKEN_V2
      });
      const recordMap = await notion.getPage(en.notionPageId);
      return <NotionRenderer recordMap={recordMap} />;
    }
    
    // 방법 3: 기본 콘텐츠 사용
    return <NotionRenderer content={en.content} />;
    */
  } catch (error) {
    return (
      <div className="error-container">
        <h2>가이드 페이지를 불러오는데 문제가 발생했습니다</h2>
        <p>잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }
}

