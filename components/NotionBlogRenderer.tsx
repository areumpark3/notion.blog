// components/NotionBlogRenderer.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { NotionRenderer } from 'react-notion-x';
import { ExtendedRecordMap } from 'notion-types';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// 동적 임포트로 컴포넌트 로딩
const Code = dynamic(() => 
  import('react-notion-x/build/third-party/code').then(mod => mod.Code), 
  { ssr: false }
);

const Collection = dynamic(() => 
  import('react-notion-x/build/third-party/collection').then(mod => mod.Collection), 
  { ssr: false }
);

const Modal = dynamic(() => 
  import('react-notion-x/build/third-party/modal').then(mod => mod.Modal), 
  { ssr: false }
);

interface NotionBlogRendererProps {
  recordMap: ExtendedRecordMap;
  pageId?: string; // 현재 페이지 ID를 받음
}

export default function NotionBlogRenderer({ recordMap, pageId }: NotionBlogRendererProps) {
  const router = useRouter();
  const [childPages, setChildPages] = useState<{id: string, title: string}[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>('');
  
  // 페이지 로드 시 하위 페이지 감지 및 현재 페이지 ID 설정
  useEffect(() => {
    if (!recordMap) return;
    
    // 페이지 ID 설정
    if (pageId) {
      setCurrentPageId(pageId);
    } else if (recordMap.block) {
      // 페이지 ID가 전달되지 않았다면 recordMap에서 루트 블록 ID를 찾음
      const rootBlockId = Object.keys(recordMap.block)[0];
      if (rootBlockId) {
        setCurrentPageId(rootBlockId);
      }
    }
    
    // 하위 페이지 감지 로직
    const childPageBlocks = Object.values(recordMap.block)
      .filter(block => {
        const blockType = block.value?.type;
        return blockType === 'page' || (blockType as any) === 'child_page';
      })
      .map(block => ({
        id: block.value.id,
        title: block.value.properties?.title?.[0]?.[0] || '하위 페이지'
      }));
    
    console.log('감지된 하위 페이지:', childPageBlocks);
    
    // 디버깅: 서명된 URL 확인
    if (recordMap.signed_urls) {
      console.log('서명된 URL 개수:', Object.keys(recordMap.signed_urls).length);
      console.log('서명된 URL 샘플:', Object.entries(recordMap.signed_urls).slice(0, 2));
    } else {
      console.log('서명된 URL이 없습니다');
    }
    
    setChildPages(childPageBlocks);
  }, [recordMap, pageId]);

  // 파일 다운로드 처리 함수
  const handleFileDownload = async (url: string, name: string, blockId: string | null) => {
    console.log('파일 다운로드 시도:', { url, name, blockId });
    
    if (url.startsWith('attachment:')) {
      const fileIdMatch = url.match(/attachment:([a-f0-9-]+):/);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;
      
      if (fileId) {
        try {
          // 서버 프록시 API 사용
          const apiUrl = `/api/notion-file?fileId=${fileId}&pageId=${blockId || currentPageId}`;
          console.log('API 호출:', apiUrl);
          
          // 새 창에서 다운로드
          window.open(apiUrl, '_blank');
          return;
        } catch (error) {
          console.error('프록시 다운로드 실패:', error);
          alert('파일을 다운로드할 수 없습니다. 노션에서 직접 다운로드해주세요.');
        }
      }
    } else {
      // 직접 URL 다운로드 시도
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } catch (error) {
        console.error('직접 다운로드 실패:', error);
        window.open(url, '_blank');
      }
    }
  };
  
  // 파일 렌더러 컴포넌트
  const FileRenderer = ({ url, name = '파일', block }: { url: string; name?: string; block?: any }) => {
    if (!url) {
      console.log('URL이 없습니다:', block);
      return <div>유효하지 않은 파일 URL</div>;
    }
    
    // 디버깅 로그
    console.log('파일 렌더링:', { url, name, blockType: block?.type });
    
    // 실제 파일 다운로드 처리 함수
    const handleDownload = (e: React.MouseEvent) => {
      e.preventDefault();
      const blockId = block?.id || block?.value?.id;
      handleFileDownload(url, name, blockId);
    };
    
    return (
      <div className="file-attachment">
        <button onClick={handleDownload} className="download-btn">
          {name} 다운로드
        </button>
      </div>
    );
  };
  
  // 하위 페이지 네비게이션
  const handleChildPageNav = (pageId: string) => {
    const normalizedId = pageId.replace(/-/g, '');
    console.log(`하위 페이지로 이동: /blog/post-${normalizedId}`);
    router.push(`/blog/post-${normalizedId}`);
  };

  if (!recordMap) {
    return <div className="error-message">콘텐츠를 불러올 수 없습니다.</div>;
  }

  return (
    <div className="notion-content-wrapper">
      {/* 하위 페이지 목록 */}
      {childPages.length > 0 && (
        <div className="child-pages-list">
          <h3>하위 페이지</h3>
          <ul>
            {childPages.map(page => (
              <li key={page.id}>
                <button 
                  onClick={() => handleChildPageNav(page.id)}
                  className="child-page-link"
                >
                  📄 {page.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* NotionRenderer 컴포넌트 */}
      <NotionRenderer
        recordMap={recordMap}
        fullPage={true}
        darkMode={false}
        components={{
          Code,
          Collection,
          Modal,
          // 첨부 파일 처리
          File: ({ block }: { block: any }) => {
            const url = 
              block?.properties?.source?.[0]?.[0] || 
              block?.value?.properties?.source?.[0]?.[0] ||
              block?.file?.external?.url || 
              block?.file?.url;
              
            const name = 
              block?.properties?.title?.[0]?.[0] || 
              block?.value?.properties?.title?.[0]?.[0] ||
              block?.file_name || 
              block?.file?.name || 
              '첨부파일';
              
            return <FileRenderer url={url} name={name} block={block} />;
          },
          Pdf: ({ block }: { block: any }) => {
            const url = 
              block?.properties?.source?.[0]?.[0] || 
              block?.value?.properties?.source?.[0]?.[0] ||
              block?.pdf?.external?.url || 
              block?.pdf?.url;
              
            const name = 
              block?.properties?.title?.[0]?.[0] || 
              block?.value?.properties?.title?.[0]?.[0] ||
              block?.file_name || 
              block?.pdf?.name || 
              'PDF 문서';
              
            return <FileRenderer url={url} name={name} block={block} />;
          },
          Image: ({ block, src }: { block: any; src?: string }) => {
            // 이미지가 첨부 파일인지 확인
            const isAttachment = 
              (block?.value?.properties?.source?.[0]?.[0] && block?.value?.properties?.source?.[0]?.[0]?.startsWith('attachment:')) ||
              block?.is_file_attachment;
            
            if (isAttachment) {
              const url = 
                block?.value?.properties?.source?.[0]?.[0] || 
                src || 
                '';
                
              const name = 
                block?.value?.properties?.title?.[0]?.[0] || 
                block?.file_name || 
                '이미지';
                
              return <FileRenderer url={url} name={name} block={block} />;
            }
            
            // 일반 이미지는 기본 이미지 태그 사용
            const imageUrl = 
              src || 
              block?.value?.properties?.source?.[0]?.[0] || 
              block?.image?.external?.url || 
              block?.image?.url;
              
            if (!imageUrl) return null;
            
            return (
              <img 
                src={imageUrl} 
                alt={block?.value?.properties?.caption?.[0]?.[0] || block?.image?.caption?.[0]?.plain_text || '이미지'} 
                className="notion-image" 
              />
            );
          }
        } as any}
      />
    </div>
  );
}
