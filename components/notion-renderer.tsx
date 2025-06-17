//components\notion-renderer.tsx

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
    
    // 노션 내부 파일 링크인 경우 API 엔드포인트 사용
    const isNotionFile = url.includes('notion.so') || url.includes('amazonaws.com');
    const downloadUrl = isNotionFile 
      ? `/api/notion-file?fileUrl=${encodeURIComponent(url)}&fileName=${encodeURIComponent(name)}`
      : url;
      
    return (
      <div className="notion-file-block">
        <a href={downloadUrl} download className="notion-file-link">
          <div className="notion-file-icon">📎</div>
          <div className="notion-file-info">
            <div className="notion-file-name">{name}</div>
            <div className="notion-file-action">다운로드</div>
          </div>
        </a>
      </div>
    );
  };

  // 토글 렌더러
  const ToggleRenderer = ({ summary, children }: { summary: string; children: React.ReactNode }) => {
    return (
      <details className="notion-toggle">
        <summary className="notion-toggle-summary">{summary}</summary>
        <div className="notion-toggle-content">{children}</div>
      </details>
    );
  };

  // 표 렌더러
  const TableRenderer = ({ headers, rows }: { headers: string[]; rows: string[][] }) => {
    return (
      <div className="notion-table-container">
        <table className="notion-table">
          <thead>
            <tr className="notion-table-row">
              {headers.map((header, i) => (
                <th key={i} className="notion-table-cell">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="notion-table-row">
                {row.map((cell, j) => (
                  <td key={j} className="notion-table-cell">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
              <p key={index} className="notion-text">
                {(block.paragraph?.rich_text || []).map((text: any, i: React.Key) => (
                  <span 
                    key={i} 
                    className={`
                      ${text.annotations?.bold ? 'font-bold' : ''}
                      ${text.annotations?.italic ? 'italic' : ''}
                      ${text.annotations?.underline ? 'underline' : ''}
                      ${text.annotations?.strikethrough ? 'line-through' : ''}
                      ${text.annotations?.code ? 'notion-inline-code' : ''}
                    `}
                  >
                    {text.plain_text as string}
                  </span>
                ))}
              </p>
            );
          }
          
          // 제목 블록
          if (block.type === 'heading_1') {
            return (
              <h1 key={index} className="notion-h1">
                {block.heading_1?.rich_text?.map((text: any, i: React.Key | null | undefined) => (
                  <span key={i}>{text.plain_text as string}</span>
                ))}
              </h1>
            );
          }
          
          if (block.type === 'heading_2') {
            return (
              <h2 key={index} className="notion-h2">
                {block.heading_2?.rich_text?.map((text: any, i: React.Key | null | undefined) => (
                  <span key={i}>{text.plain_text as string}</span>
                ))}
              </h2>
            );
          }
          
          if (block.type === 'heading_3') {
            return (
              <h3 key={index} className="notion-h3">
                {block.heading_3?.rich_text?.map((text: any, i: React.Key | null | undefined) => (
                  <span key={i}>{text.plain_text as string}</span>
                ))}
              </h3>
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
          
          // 이미지 블록
          if (block.type === 'image') {
            const imageUrl = block.image?.external?.url || block.image?.file?.url;
            const caption = block.image?.caption?.map((c: any) => c.plain_text).join('') || '';
            
            return (
              <figure key={index} className="notion-image-block">
                <img src={imageUrl} alt={caption} className="notion-image" />
                {caption && <figcaption className="notion-image-caption">{caption}</figcaption>}
              </figure>
            );
          }
          
          // 토글 블록
          if (block.type === 'toggle') {
            const summary = block.toggle?.rich_text?.map((t: any) => t.plain_text).join('') || '토글';
            
            return (
              <ToggleRenderer key={index} summary={summary}>
                {/* 여기에 토글 내부 콘텐츠를 렌더링할 수 있습니다 */}
                <div>토글 내용</div>
              </ToggleRenderer>
            );
          }
          
          // 표 블록
          if (block.type === 'table') {
            const rows = block.table?.rows || [];
            const headers = rows[0]?.cells.map((cell: any[]) => 
              cell.map((c: any) => c.plain_text).join('')
            ) || [];
            
            const tableRows = rows.slice(1).map((row: { cells: any[][] }) => 
              row.cells.map(cell => cell.map((c: any) => c.plain_text).join(''))
            );
            
            return (
              <TableRenderer key={index} headers={headers} rows={tableRows} />
            );
          }
          
          // 하위 페이지 블록
          if (block.type === 'child_page' || block.is_child_page) {
            const pageId = block.id || block.page_id;
            const pageTitle = block.child_page?.title || block.page_title || '하위 페이지';
            const pageSlug = `post-${pageId.replace(/-/g, '')}`;
            
            // 직접 클릭 이벤트 처리
            const handleClick = (e: React.MouseEvent) => {
              e.preventDefault();
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
