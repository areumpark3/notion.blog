// app/guide/kr/page.tsx
import { kr } from 'content/guide';
import NotionRenderer from 'components/notion-renderer';

export default async function KrGuidePage() {
  try {
    // 간단한 렌더링으로 빌드 오류 해결
    return <NotionRenderer content={kr.content} />;
  } catch (error) {
    return (
      <div className="error-container">
        <h2>가이드 페이지를 불러오는데 문제가 발생했습니다</h2>
        <p>잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }
}

