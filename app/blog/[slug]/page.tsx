import { notFound } from 'next/navigation';
import { baseUrl } from 'app/sitemap';
import posts from 'content/posts';
import NotionClientRenderer from '../../../components/NotionBlogRenderer';
import Comment from '../../../components/comment';
import { NotionAPI } from 'notion-client';
import fs from 'fs';
import path from 'path';

// NextJS 15.2.1에 맞게 Page 컴포넌트 정의
export default async function Page({ params }: { params: { slug: string } }) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { slug } = resolvedParams;
  
  // 일반 게시물 찾기
  let post = posts.find((post) => post.slug === slug);
  
  // 게시물을 찾을 수 없는 경우, 하위 페이지인지 확인
  if (!post) {
    // 슬러그에서 페이지 ID 추출 
    const pageIdMatch = slug.match(/post-([a-f0-9]+)/);
    
    if (pageIdMatch && pageIdMatch[1]) {
      const pageId = pageIdMatch[1];
      console.log(`하위 페이지 ID 감지: ${pageId}, 슬러그: ${slug}`);
      
      // 하위 페이지 JSON 파일 확인
      const childPagePath = path.join(process.cwd(), 'notion-data', `child_page_${pageId}.json`);
      const postPagePath = path.join(process.cwd(), 'notion-data', `post_${pageId}.json`);
      
      let pageData = null;
      
      if (fs.existsSync(childPagePath)) {
        console.log(`하위 페이지 파일 발견: ${childPagePath}`);
        pageData = JSON.parse(fs.readFileSync(childPagePath, 'utf8'));
      } else if (fs.existsSync(postPagePath)) {
        console.log(`게시물 파일 발견: ${postPagePath}`);
        pageData = JSON.parse(fs.readFileSync(postPagePath, 'utf8'));
      }
      
      if (pageData) {
        // 페이지 타이틀과 블록 데이터 추출
        let pageTitle = '하위 페이지';
        let pageBlocks = [];
        
        if (pageData.pageInfo) {
          // 페이지 정보가 있는 경우
          pageTitle = pageData.pageInfo.properties?.title?.title?.[0]?.plain_text || '하위 페이지';
          pageBlocks = pageData.blocks || [];
        } else if (pageData.blocks) {
          // 블록만 있는 경우
          const titleBlock = pageData.blocks.find(
            (block: any) => block.type === 'heading_1' || block.type === 'title'
          );
          
          if (titleBlock) {
            pageTitle = 
              titleBlock.heading_1?.rich_text?.[0]?.plain_text || 
              titleBlock.title?.rich_text?.[0]?.plain_text || 
              '하위 페이지';
          }
          
          pageBlocks = pageData.blocks;
        }
        
        // 하위 페이지용 임시 포스트 객체 생성
        post = {
          title: pageTitle,
          slug,
          content: { blocks: pageBlocks },
          date: new Date().toISOString().split('T')[0],
          description: '',
          notionPageId: pageId,
          has_children: true
        };
      }
    }
    
    // 여전히 찾을 수 없으면 404
    if (!post) {
      notFound();
    }
  }

  try {
    // 노션 API 토큰 확인
    const notionToken = process.env.NOTION_TOKEN_V2;
    if (!notionToken) {
      throw new Error('NOTION_TOKEN_V2 환경 변수가 설정되지 않았습니다');
    }

    const notion = new NotionAPI({
      authToken: notionToken
    });
    
    // 노션 페이지 가져오기
    const recordMap = await notion.getPage(post.notionPageId);
    
    return (
      <section>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              datePublished: post.date,
              dateModified: post.date,
              description: post.description,
              image: post.image
                ? `${baseUrl}${post.image}`
                : `/og?title=${encodeURIComponent(post.title)}`,
              url: `${baseUrl}/blog/${post.slug}`,
              author: {
                '@type': 'Person',
                name: 'My Portfolio',
              },
            }),
          }}
        />
        {/* 여기를 수정: pageId prop 추가 */}
        <NotionClientRenderer recordMap={recordMap} pageId={post.notionPageId} />
        <Comment />
      </section>
    );
  } catch (error) {
    console.log('노션 API 호출 실패, 로컬 데이터 사용:', error instanceof Error ? error.message : String(error));
    
    // 로컬 데이터로 대체 렌더링
    if (post.content && post.content.blocks) {
      return (
        <section>
          <h1>{post.title}</h1>
          <div className="notion-content">
            {/* 로컬 데이터 기반 렌더링 */}
            {post.content.blocks?.map((block, index) => {
              // 텍스트 블록
              if (block.type === 'paragraph') {
                return (
                  <p key={index} className="notion-paragraph">
                    {(block.paragraph?.rich_text || []).map((text: any, i: number) => (
                      <span key={i} className={text.annotations?.bold ? 'notion-bold' : ''}>
                        {text.plain_text}
                      </span>
                    ))}
                  </p>
                );
              }
              
              // 제목 블록
              if (block.type === 'heading_1') {
                return (
                  <h1 key={index} className="notion-h1">
                    {block.heading_1?.rich_text?.map((text: any, i: number) => (
                      <span key={i}>{text.plain_text}</span>
                    ))}
                  </h1>
                );
              }
              
              // 파일 블록 - 요구사항에 맞게 첨부파일 다운로드 UI 표시
              if (block.type === 'file' || block.is_file_attachment) {
                const fileUrl = block.file?.external?.url || block.file?.url;
                const fileName = block.file_name || block.file?.name || '첨부파일';
                
                // 첨부파일 다운로드 링크
                if (fileUrl && fileUrl.startsWith('attachment:')) {
                  const fileIdMatch = fileUrl.match(/attachment:([a-f0-9-]+):/);
                  const fileId = fileIdMatch ? fileIdMatch[1] : null;
                  
                  if (fileId) {
                    return (
                      <div key={index} className="file-attachment">
                        <a href={`/api/notion-file?fileId=${fileId}&pageId=${post.notionPageId}`} target="_blank" rel="noopener noreferrer">
                          {fileName} 다운로드
                        </a>
                      </div>
                    );
                  }
                }
                
                return (
                  <div key={index} className="file-attachment">
                    <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
                      {fileName} 다운로드
                    </a>
                  </div>
                );
              }
              
              // 하위 페이지 블록
              if (block.type === 'child_page' || block.is_child_page) {
                const pageId = block.id || block.page_id;
                const pageTitle = block.child_page?.title || block.page_title || '하위 페이지';
                const pageSlug = `post-${pageId.replace(/-/g, '')}`;
                
                return (
                  <div key={index} className="notion-child-page">
                    <a 
                      href={`/blog/${pageSlug}`} 
                      className="notion-page-link"
                    >
                      📄 {pageTitle}
                    </a>
                  </div>
                );
              }
              
              // 기본 블록
              return (
                <div key={index} className="notion-unsupported-block">
                  {block.type} 블록
                </div>
              );
            })}
          </div>
          <Comment />
        </section>
      );
    }
    
    // 오류 메시지 표시
    return (
      <section>
        <div className="error-container">
          <h2>페이지를 불러오는데 문제가 발생했습니다</h2>
          <p>노션 페이지를 찾을 수 없거나 접근할 수 없습니다.</p>
          <p>페이지 ID: {post.notionPageId}</p>
        </div>
      </section>
    );
  }
}
