// components/notion-renderer.tsx
'use client';

import React from 'react';
import { ExtendedRecordMap } from 'notion-types';
import NotionBlogRenderer from './NotionBlogRenderer';
import Link from 'next/link';

interface NotionRendererProps {
  recordMap?: ExtendedRecordMap;
  content?: { blocks: any[] };
}

export default function NotionRenderer({ recordMap, content }: NotionRendererProps) {
  // 첨부파일 렌더러
  const FileRenderer = ({ url, name = '파일' }: { url: string; name?: string }) => {
    if (!url) {
      return <div>유효하지 않은 파일 URL</div>;
    }
    return (
      <div className="file-attachment">
        <a href={url} download>
          {name} 다운로드
        </a>
      </div>
    );
  };

  // content 객체로 넘어온 경우 블록 데이터 직접 렌더링
  if (content && !recordMap) {
    return (
      <div className="notion-content">
        {content.blocks?.map((block, index) => {
          // 텍스트 블록
          if (block.type === 'paragraph') {
            return (
              <p key={index} className="notion-paragraph">
                {(block.paragraph?.rich_text || []).map((text: any, i: React.Key) => (
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
                {block.heading_1?.rich_text?.map((text: { plain_text: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, i: React.Key | null | undefined) => (
                  <span key={i}>{text.plain_text}</span>
                ))}
              </h1>
            );
          }
          
          // 파일 블록
          if (block.type === 'file' || block.is_file_attachment) {
            const fileUrl = block.file?.external?.url || block.file?.url;
            return (
              <FileRenderer 
                key={index} 
                url={fileUrl} 
                name={block.file_name || block.file?.name || '첨부파일'} 
              />
            );
          }
          
          // 하위 페이지 블록
          if (block.type === 'child_page' || block.is_child_page) {
            const pageId = block.id || block.page_id;
            const pageTitle = block.child_page?.title || block.page_title || '하위 페이지';
            const pageSlug = `post-${pageId.replace(/-/g, '')}`;
            
            console.log(`하위 페이지 링크 생성: ID=${pageId}, 제목=${pageTitle}, 슬러그=${pageSlug}`);
            
            // 직접 클릭 이벤트 처리
            const handleClick = (e: React.MouseEvent) => {
              e.preventDefault();
              console.log('하위 페이지로 이동:', `/blog/${pageSlug}`);
              window.location.href = `/blog/${pageSlug}`;
            };
            
            return (
              <div key={index} className="notion-child-page">
                <a 
                  href={`/blog/${pageSlug}`} 
                  className="notion-page-link"
                  onClick={handleClick}
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
    );
  }

  // recordMap이 제공된 경우 (블로그 포스트) NotionBlogRenderer 사용
  if (recordMap) {
    return <NotionBlogRenderer recordMap={recordMap} />;
  }

  // 데이터가 없는 경우
  return <div className="error-message">콘텐츠를 불러올 수 없습니다.</div>;
}
