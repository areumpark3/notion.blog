// lib/notion.ts
import { Client, isFullBlock } from '@notionhq/client'

// 환경 변수 유효성 검사 함수
const validateEnv = () => {
  if (!process.env.NOTION_API_KEY?.startsWith('ntn_')) {
    throw new Error('잘못된 NOTION_API_KEY 형식입니다')
  }
  
  if (!process.env.NOTION_DATABASE_ID || 
      !/^[0-9a-f]{32}$/.test(process.env.NOTION_DATABASE_ID)) {
    throw new Error('잘못된 NOTION_DATABASE_ID 형식입니다')
  }
}

// Notion 클라이언트 초기화
export const notionClient = new Client({ 
  auth: process.env.NOTION_API_KEY 
})

// 구성 객체 내보내기
export const config = {
  notionAPIKey: process.env.NOTION_API_KEY,
  databaseId: process.env.NOTION_DATABASE_ID!,
  validateEnv
}

// Post 인터페이스 정의
export interface Post {
  id: string;
  title: string;
  slug: string;
  date: string;
  content?: string;
  status?: string;
}

// 사용자 정의 타입 가드 함수
function isValidBlockObject(block: any): block is { type: string; id: string; [key: string]: any } {
  return block && 
         typeof block === 'object' && 
         'type' in block && 
         typeof block.type === 'string' &&
         'id' in block;
}

// 유틸리티 함수들
export function extractTitle(properties: any): string {
  try {
    if (properties.Title?.title?.[0]?.plain_text) {
      return properties.Title.title[0].plain_text;
    }
    
    for (const [key, prop] of Object.entries(properties)) {
      const property = prop as any;
      if (property.type === 'title' && property.title?.[0]?.plain_text) {
        return property.title[0].plain_text;
      }
    }
    
    if (properties.Name?.title?.[0]?.plain_text) {
      return properties.Name.title[0].plain_text;
    }
    
    return '제목 없음';
  } catch (error) {
    console.error('제목 추출 중 오류:', error instanceof Error ? error.message : String(error));
    return '제목 없음';
  }
}

export function extractSlug(properties: any): string {
  try {
    if (properties.Slug?.rich_text?.[0]?.plain_text) {
      return properties.Slug.rich_text[0].plain_text;
    }
    
    const title = extractTitle(properties);
    if (title === '제목 없음') {
      return `post-${Date.now()}`;
    }
    
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  } catch (error) {
    console.error('슬러그 추출 중 오류:', error instanceof Error ? error.message : String(error));
    return `post-${Date.now()}`;
  }
}

export function generateSlug(properties: any): string {
  return extractSlug(properties);
}

export function extractStatus(properties: any): string {
  try {
    if (properties.Status?.select?.name) {
      return properties.Status.select.name;
    }
    return 'Draft';
  } catch (error) {
    console.error('상태 추출 중 오류:', error instanceof Error ? error.message : String(error));
    return 'Draft';
  }
}

export function extractDate(properties: any): string {
  try {
    if (properties.Date?.date?.start) {
      return properties.Date.date.start;
    }
    
    return new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error('날짜 추출 중 오류:', error instanceof Error ? error.message : String(error));
    return new Date().toISOString().split('T')[0];
  }
}

export function transformNotionPageToPost(page: any): Post {
  return {
    id: page.id,
    title: extractTitle(page.properties),
    slug: extractSlug(page.properties),
    date: extractDate(page.properties),
    status: extractStatus(page.properties),
  };
}

// 색상 매핑 객체
const colorMap: { [key: string]: string } = {
  'default': '',
  'gray': '#9B9A97',
  'brown': '#64473A',
  'orange': '#D9730D',
  'yellow': '#DFAB01',
  'green': '#0F7B6C',
  'blue': '#0B6E99',
  'purple': '#6940A5',
  'pink': '#AD1A72',
  'red': '#E03E3E',
  'gray_background': '#F1F1EF',
  'brown_background': '#F4EEEE',
  'orange_background': '#FAEBDD',
  'yellow_background': '#FBF3DB',
  'green_background': '#EDF3F0',
  'blue_background': '#E7F3F8',
  'purple_background': '#F6F3F9',
  'pink_background': '#FAF1F5',
  'red_background': '#FDEBEC'
};

// 강화된 Rich Text 파싱 함수 (완전한 스타일 지원)
function parseRichTextAdvanced(richTextArray: any[]): string {
  if (!richTextArray || !Array.isArray(richTextArray) || richTextArray.length === 0) {
    return '';
  }
  
  return richTextArray.map((text: any) => {
    if (!text) return '';
    
    let content = text.plain_text || text.text?.content || '';
    if (!content) return '';
    
    const annotations = text.annotations || {};
    
    // 기본 스타일 적용
    if (annotations.bold) content = `<strong>${content}</strong>`;
    if (annotations.italic) content = `<em>${content}</em>`;
    if (annotations.strikethrough) content = `<del>${content}</del>`;
    if (annotations.underline) content = `<u>${content}</u>`;
    if (annotations.code) content = `<code class="notion-inline-code">${content}</code>`;
    
    // 색상 및 배경색 처리
    const color = annotations.color || 'default';
    if (color && color !== 'default') {
      const cssColor = colorMap[color];
      if (cssColor) {
        if (color.endsWith('_background')) {
          content = `<span style="background-color: ${cssColor}; padding: 2px 4px; border-radius: 3px;">${content}</span>`;
        } else {
          content = `<span style="color: ${cssColor};">${content}</span>`;
        }
      }
    }
    
    // 링크 처리
    if (text.href || text.text?.link?.url) {
      const url = text.href || text.text.link.url;
      content = `<a href="${url}" target="_blank" rel="noopener noreferrer">${content}</a>`;
    }
    
    return content;
  }).join('');
}

// 목차 생성 함수
function generateTableOfContents(blocks: any[]): string {
  const headings: { level: number; text: string; id: string }[] = [];
  
  blocks.forEach((block, index) => {
    if (isValidBlockObject(block) && block.type.startsWith('heading_')) {
      const level = parseInt(block.type.replace('heading_', ''));
      const richText = block[block.type]?.rich_text;
      
      if (richText && richText.length > 0) {
        const text = richText.map((t: any) => t.plain_text || '').join('');
        const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-')}`;
        
        headings.push({ level, text, id });
      }
    }
  });
  
  if (headings.length === 0) return '';
  
  let toc = '<div class="notion-table-of-contents">\n<h2>목차</h2>\n<ul>\n';
  
  headings.forEach(heading => {
    const indent = '  '.repeat(heading.level - 1);
    toc += `${indent}<li><a href="#${heading.id}">${heading.text}</a></li>\n`;
  });
  
  toc += '</ul>\n</div>\n\n';
  return toc;
}

// 강화된 테이블 블록 파싱
async function parseTableBlockAdvanced(block: any): Promise<string> {
  try {
    if (!block.has_children) {
      return '<div class="notion-table-container"><p>빈 테이블</p></div>\n\n';
    }
    
    // 모든 테이블 행 가져오기
    let allRows: any[] = [];
    let hasMore = true;
    let nextCursor: string | null = null;
    
    while (hasMore) {
      const queryOptions: any = {
        block_id: block.id,
        page_size: 100,
      };
      
      if (nextCursor) {
        queryOptions.start_cursor = nextCursor;
      }
      
      const response = await notionClient.blocks.children.list(queryOptions);
      
      const tableRows = response.results.filter(row => {
        return isValidBlockObject(row) && row.type === 'table_row';
      });
      
      allRows = allRows.concat(tableRows);
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
    }
    
    if (allRows.length === 0) {
      return '<div class="notion-table-container"><p>테이블 행이 없습니다</p></div>\n\n';
    }
    
    // 최대 컬럼 수 계산
    let maxCols = 0;
    allRows.forEach((row: any) => {
      const cellCount = row.table_row?.cells?.length || 0;
      maxCols = Math.max(maxCols, cellCount);
    });
    
    // HTML 테이블 생성
    let tableHTML = '<div class="notion-table-container">\n<table class="notion-table">\n';
    
    // 헤더 처리
    if (block.table?.has_column_header && allRows.length > 0) {
      const headerRow = allRows[0];
      tableHTML += '<thead>\n<tr>\n';
      
      const headerCells = headerRow.table_row?.cells || [];
      for (let i = 0; i < maxCols; i++) {
        const cellContent = i < headerCells.length ? 
          parseRichTextAdvanced(headerCells[i]) : '';
        tableHTML += `<th class="notion-table-header">${cellContent || '&nbsp;'}</th>\n`;
      }
      
      tableHTML += '</tr>\n</thead>\n';
      
      // 데이터 행들
      if (allRows.length > 1) {
        tableHTML += '<tbody>\n';
        for (let i = 1; i < allRows.length; i++) {
          tableHTML += parseTableRowAdvanced(allRows[i], maxCols);
        }
        tableHTML += '</tbody>\n';
      }
    } else {
      // 헤더 없는 경우
      tableHTML += '<tbody>\n';
      allRows.forEach((row: any) => {
        tableHTML += parseTableRowAdvanced(row, maxCols);
      });
      tableHTML += '</tbody>\n';
    }
    
    tableHTML += '</table>\n</div>\n\n';
    return tableHTML;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('테이블 파싱 오류:', errorMessage);
    return `<div class="notion-error">테이블 파싱 오류: ${errorMessage}</div>\n\n`;
  }
}

// 강화된 테이블 행 파싱
function parseTableRowAdvanced(row: any, maxCols: number): string {
  try {
    let rowHTML = '<tr>\n';
    const cells = row.table_row?.cells || [];
    
    for (let i = 0; i < maxCols; i++) {
      const cellContent = i < cells.length ? 
        parseRichTextAdvanced(cells[i]) : '';
      rowHTML += `<td class="notion-table-cell">${cellContent || '&nbsp;'}</td>\n`;
    }
    
    rowHTML += '</tr>\n';
    return rowHTML;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('테이블 행 파싱 오류:', errorMessage);
    return '<tr><td colspan="' + maxCols + '">행 파싱 오류</td></tr>\n';
  }
}

// 자식 블록 파싱 (페이지네이션 지원)
async function parseChildBlocks(blockId: string, level: number = 0): Promise<string> {
  try {
    let content = '';
    let hasMore = true;
    let nextCursor: string | null = null;
    
    while (hasMore) {
      const queryOptions: any = {
        block_id: blockId,
        page_size: 100,
      };
      
      if (nextCursor) {
        queryOptions.start_cursor = nextCursor;
      }
      
      const response = await notionClient.blocks.children.list(queryOptions);
      
      for (const childBlock of response.results) {
        content += await parseBlockAdvanced(childBlock, level + 1);
      }
      
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
    }
    
    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('자식 블록 파싱 오류:', errorMessage);
    return '';
  }
}

// 완전한 블록 파싱 함수 (모든 노션 형식 지원)
async function parseBlockAdvanced(block: any, level: number = 0, blockIndex: number = 0): Promise<string> {
  if (!block || typeof block !== 'object') {
    return '';
  }
  
  if (!isFullBlock(block) && !isValidBlockObject(block)) {
    return '';
  }
  
  if (!block.type) {
    return '';
  }
  
  let content = '';
  const blockAsAny = block as any;
  
  try {
    switch (block.type) {
      case 'paragraph':
        if (block.paragraph?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.paragraph.rich_text);
          content = `<p class="notion-paragraph">${text}</p>\n\n`;
        } else {
          content = '<p class="notion-paragraph">&nbsp;</p>\n\n';
        }
        break;
        
      case 'heading_1':
        if (block.heading_1?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.heading_1.rich_text);
          const id = `heading-${blockIndex}-${text.replace(/<[^>]*>/g, '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '-')}`;
          
          if (block.heading_1.is_toggleable || block.has_children) {
            content = `<details class="notion-toggle notion-heading-toggle">\n`;
            content += `<summary class="notion-heading-1" id="${id}">${text}</summary>\n`;
            content += `<div class="notion-toggle-content">\n`;
          } else {
            content = `<h1 class="notion-heading-1" id="${id}">${text}</h1>\n\n`;
          }
        }
        break;
        
      case 'heading_2':
        if (block.heading_2?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.heading_2.rich_text);
          const id = `heading-${blockIndex}-${text.replace(/<[^>]*>/g, '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '-')}`;
          
          if (block.heading_2.is_toggleable || block.has_children) {
            content = `<details class="notion-toggle notion-heading-toggle">\n`;
            content += `<summary class="notion-heading-2" id="${id}">${text}</summary>\n`;
            content += `<div class="notion-toggle-content">\n`;
          } else {
            content = `<h2 class="notion-heading-2" id="${id}">${text}</h2>\n\n`;
          }
        }
        break;
        
      case 'heading_3':
        if (block.heading_3?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.heading_3.rich_text);
          const id = `heading-${blockIndex}-${text.replace(/<[^>]*>/g, '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '-')}`;
          
          if (block.heading_3.is_toggleable || block.has_children) {
            content = `<details class="notion-toggle notion-heading-toggle">\n`;
            content += `<summary class="notion-heading-3" id="${id}">${text}</summary>\n`;
            content += `<div class="notion-toggle-content">\n`;
          } else {
            content = `<h3 class="notion-heading-3" id="${id}">${text}</h3>\n\n`;
          }
        }
        break;
        
      case 'quote':
        if (block.quote?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.quote.rich_text);
          const color = block.quote?.color || 'default';
          const colorClass = color !== 'default' ? ` notion-${color}` : '';
          content = `<blockquote class="notion-quote${colorClass}">${text}</blockquote>\n\n`;
        }
        break;
        
      case 'callout':
        if (block.callout?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.callout.rich_text);
          const icon = block.callout.icon?.emoji || '💡';
          const color = block.callout?.color || 'default';
          const colorClass = color !== 'default' ? ` notion-${color}` : '';
          content = `<div class="notion-callout${colorClass}">`;
          content += `<div class="notion-callout-icon">${icon}</div>`;
          content += `<div class="notion-callout-text">${text}</div>`;
          content += `</div>\n\n`;
        }
        break;
        
      case 'toggle':
        if (block.toggle?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.toggle.rich_text);
          content = `<details class="notion-toggle">\n`;
          content += `<summary class="notion-toggle-summary">${text}</summary>\n`;
          content += `<div class="notion-toggle-content">\n`;
        }
        break;
        
      case 'bulleted_list_item':
        if (block.bulleted_list_item?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.bulleted_list_item.rich_text);
          const color = block.bulleted_list_item?.color || 'default';
          const colorClass = color !== 'default' ? ` notion-${color}` : '';
          content = `<li class="notion-list-item${colorClass}">${text}</li>\n`;
        }
        break;
        
      case 'numbered_list_item':
        if (block.numbered_list_item?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.numbered_list_item.rich_text);
          const color = block.numbered_list_item?.color || 'default';
          const colorClass = color !== 'default' ? ` notion-${color}` : '';
          content = `<li class="notion-list-item notion-numbered-item${colorClass}">${text}</li>\n`;
        }
        break;
        
      case 'to_do':
        if (block.to_do?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.to_do.rich_text);
          const checked = block.to_do.checked ? 'checked' : '';
          const color = block.to_do?.color || 'default';
          const colorClass = color !== 'default' ? ` notion-${color}` : '';
          content = `<div class="notion-todo${colorClass}">`;
          content += `<input type="checkbox" ${checked} disabled class="notion-checkbox">`;
          content += `<span class="notion-todo-text">${text}</span>`;
          content += `</div>\n`;
        }
        break;
        
      case 'code':
        if (block.code?.rich_text?.length > 0) {
          const text = block.code.rich_text.map((t: any) => t.plain_text).join('');
          const language = block.code.language || 'text';
          content = `<div class="notion-code-block">`;
          content += `<pre><code class="language-${language}">${text}</code></pre>`;
          content += `</div>\n\n`;
        }
        break;
        
      case 'divider':
        content = '<hr class="notion-divider">\n\n';
        break;
        
      case 'image':
        if (block.image?.file?.url || block.image?.external?.url) {
          const url = block.image.file?.url || block.image.external?.url;
          const caption = block.image.caption?.length > 0 
            ? parseRichTextAdvanced(block.image.caption) 
            : '';
          content = `<figure class="notion-image">`;
          content += `<img src="${url}" alt="${caption}" loading="lazy">`;
          if (caption) {
            content += `<figcaption class="notion-image-caption">${caption}</figcaption>`;
          }
          content += `</figure>\n\n`;
        }
        break;
        
      case 'bookmark':
        if (block.bookmark?.url) {
          const url = block.bookmark.url;
          const caption = block.bookmark.caption?.length > 0 
            ? parseRichTextAdvanced(block.bookmark.caption)
            : url;
          content = `<div class="notion-bookmark">`;
          content += `<a href="${url}" target="_blank" rel="noopener noreferrer">`;
          content += `<div class="notion-bookmark-content">`;
          content += `<div class="notion-bookmark-title">${caption}</div>`;
          content += `<div class="notion-bookmark-url">${url}</div>`;
          content += `</div></a></div>\n\n`;
        }
        break;
        
      case 'embed':
        if (block.embed?.url) {
          const url = block.embed.url;
          content = `<div class="notion-embed">`;
          content += `<iframe src="${url}" frameborder="0" allowfullscreen></iframe>`;
          content += `</div>\n\n`;
        }
        break;
        
      case 'table':
        if (block.has_children) {
          content = await parseTableBlockAdvanced(block);
        }
        break;
        
      case 'table_row':
        // 테이블 행은 상위 테이블에서 처리
        break;
        
      case 'column_list':
        if (block.has_children) {
          content = await parseColumnListAdvanced(block);
        }
        break;
        
      case 'column':
        if (block.has_children) {
          content = await parseColumnAdvanced(block);
        }
        break;
        
      case 'file':
        if (block.file?.file?.url || block.file?.external?.url) {
          const url = block.file.file?.url || block.file.external?.url;
          const caption = block.file.caption?.length > 0 
            ? parseRichTextAdvanced(block.file.caption) 
            : '파일';
          content = `<div class="notion-file">`;
          content += `<a href="${url}" target="_blank" rel="noopener noreferrer">`;
          content += `<span class="notion-file-icon">📄</span>`;
          content += `<span class="notion-file-name">${caption}</span>`;
          content += `</a></div>\n\n`;
        }
        break;
        
      case 'video':
        if (block.video?.file?.url || block.video?.external?.url) {
          const url = block.video.file?.url || block.video.external?.url;
          const caption = block.video.caption?.length > 0 
            ? parseRichTextAdvanced(block.video.caption) 
            : '';
          content = `<figure class="notion-video">`;
          content += `<video controls src="${url}"></video>`;
          if (caption) {
            content += `<figcaption class="notion-video-caption">${caption}</figcaption>`;
          }
          content += `</figure>\n\n`;
        }
        break;
        
      case 'audio':
        if (block.audio?.file?.url || block.audio?.external?.url) {
          const url = block.audio.file?.url || block.audio.external?.url;
          const caption = block.audio.caption?.length > 0 
            ? parseRichTextAdvanced(block.audio.caption) 
            : '';
          content = `<figure class="notion-audio">`;
          content += `<audio controls src="${url}"></audio>`;
          if (caption) {
            content += `<figcaption class="notion-audio-caption">${caption}</figcaption>`;
          }
          content += `</figure>\n\n`;
        }
        break;
        
      case 'pdf':
        if (block.pdf?.file?.url || block.pdf?.external?.url) {
          const url = block.pdf.file?.url || block.pdf.external?.url;
          const caption = block.pdf.caption?.length > 0 
            ? parseRichTextAdvanced(block.pdf.caption) 
            : 'PDF 문서';
          content = `<div class="notion-pdf">`;
          content += `<a href="${url}" target="_blank" rel="noopener noreferrer">`;
          content += `<span class="notion-pdf-icon">📑</span>`;
          content += `<span class="notion-pdf-name">${caption}</span>`;
          content += `</a></div>\n\n`;
        }
        break;
        
      case 'table_of_contents':
        content = '<div class="notion-toc-placeholder">[목차가 여기에 표시됩니다]</div>\n\n';
        break;
        
      case 'breadcrumb':
        content = '<nav class="notion-breadcrumb">← 상위 페이지</nav>\n\n';
        break;
        
      case 'equation':
        if (block.equation?.expression) {
          content = `<div class="notion-equation">$$${block.equation.expression}$$</div>\n\n`;
        }
        break;
        
      case 'link_preview':
        if (block.link_preview?.url) {
          content = `<div class="notion-link-preview">`;
          content += `<a href="${block.link_preview.url}" target="_blank" rel="noopener noreferrer">`;
          content += `🔗 ${block.link_preview.url}`;
          content += `</a></div>\n\n`;
        }
        break;
        
      case 'link_to_page':
        if (block.link_to_page?.page_id) {
          content = `<div class="notion-page-link">`;
          content += `<a href="/blog/${block.link_to_page.page_id}">📄 연결된 페이지</a>`;
          content += `</div>\n\n`;
        }
        break;
        
      case 'synced_block':
        if (block.synced_block?.synced_from?.block_id) {
          content = `<div class="notion-synced-block">`;
          content += `<em>동기화된 콘텐츠 (원본: ${block.synced_block.synced_from.block_id})</em>`;
          content += `</div>\n\n`;
        } else if (block.has_children) {
          content = `<div class="notion-synced-block-original">\n`;
        }
        break;
        
      case 'template_button':
        if (block.template_button?.rich_text?.length > 0) {
          const text = parseRichTextAdvanced(block.template_button.rich_text);
          content = `<div class="notion-template-button">`;
          content += `<button class="notion-button" disabled>템플릿: ${text}</button>`;
          content += `</div>\n\n`;
        }
        break;
        
      default:
        console.warn(`지원하지 않는 블록 타입: ${block.type}`);
        if (blockAsAny[block.type]?.rich_text) {
          const text = parseRichTextAdvanced(blockAsAny[block.type].rich_text);
          content = `<div class="notion-unsupported notion-${block.type}">${text}</div>\n\n`;
        }
        break;
    }
    
    // 자식 블록 처리
    if (block.has_children && !['table', 'column_list', 'column', 'table_row'].includes(block.type)) {
      try {
        const childContent = await parseChildBlocks(block.id, level);
        
        if (block.type === 'toggle' || 
            (block.type.startsWith('heading_') && (blockAsAny[block.type].is_toggleable || block.has_children))) {
          content += childContent + '</div>\n</details>\n\n';
        } else if (block.type === 'synced_block' && !block.synced_block?.synced_from?.block_id) {
          content += childContent + '</div>\n\n';
        } else {
          content += childContent;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('자식 블록 처리 중 오류:', errorMessage);
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`블록 파싱 중 오류 (${block.type}):`, errorMessage);
    content = `<div class="notion-error">블록 파싱 오류: ${errorMessage}</div>\n\n`;
  }
  
  return content;
}

// 컬럼 리스트 파싱
async function parseColumnListAdvanced(block: any): Promise<string> {
  try {
    const columnResponse = await notionClient.blocks.children.list({
      block_id: block.id,
      page_size: 100,
    });
    
    let columnContent = '<div class="notion-column-list">\n';
    
    for (const column of columnResponse.results) {
      if (isValidBlockObject(column) && column.type === 'column') {
        columnContent += await parseColumnAdvanced(column);
      }
    }
    
    columnContent += '</div>\n\n';
    return columnContent;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('컬럼 리스트 파싱 오류:', errorMessage);
    return '';
  }
}

// 개별 컬럼 파싱
async function parseColumnAdvanced(block: any): Promise<string> {
  try {
    let columnContent = '<div class="notion-column">\n';
    
    if (block.has_children) {
      const childContent = await parseChildBlocks(block.id);
      columnContent += childContent;
    }
    
    columnContent += '</div>\n';
    return columnContent;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('컬럼 파싱 오류:', errorMessage);
    return '';
  }
}

// 메인 페이지 내용 파싱 함수
export async function getPageContent(pageId: string): Promise<string> {
  validateEnv()
  
  try {
    let allBlocks: any[] = [];
    let hasMore = true;
    let nextCursor: string | null = null;
    
    // 모든 블록 가져오기
    while (hasMore) {
      const queryOptions: any = {
        block_id: pageId,
        page_size: 100,
      };
      
      if (nextCursor) {
        queryOptions.start_cursor = nextCursor;
      }
      
      const response = await notionClient.blocks.children.list(queryOptions);
      allBlocks = allBlocks.concat(response.results);
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
    }
    
    // 목차 생성
    const toc = generateTableOfContents(allBlocks);
    
    // 블록들 파싱
    let content = '';
    for (let i = 0; i < allBlocks.length; i++) {
      const block = allBlocks[i];
      
      // 목차 블록 발견 시 실제 목차로 교체
      if (isValidBlockObject(block) && block.type === 'table_of_contents') {
        content += toc;
      } else {
        content += await parseBlockAdvanced(block, 0, i);
      }
    }
    
    // CSS 스타일 추가
    const cssStyles = `
<style>
.notion-table-of-contents {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin: 24px 0;
}

.notion-table-of-contents h2 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.notion-table-of-contents ul {
  margin: 0;
  padding-left: 20px;
}

.notion-table-of-contents li {
  margin: 8px 0;
}

.notion-table-of-contents a {
  color: #4f46e5;
  text-decoration: none;
}

.notion-table-of-contents a:hover {
  text-decoration: underline;
}

.notion-paragraph {
  margin: 12px 0;
  line-height: 1.6;
}

.notion-heading-1, .notion-heading-2, .notion-heading-3 {
  margin: 24px 0 12px 0;
  font-weight: 600;
  line-height: 1.3;
}

.notion-heading-1 { font-size: 2em; }
.notion-heading-2 { font-size: 1.5em; }
.notion-heading-3 { font-size: 1.25em; }

.notion-quote {
  border-left: 4px solid #e5e7eb;
  margin: 16px 0;
  padding: 12px 16px;
  background: #f9fafb;
  font-style: italic;
}

.notion-callout {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  margin: 16px 0;
  border-radius: 8px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.notion-callout-icon {
  font-size: 20px;
  line-height: 1;
}

.notion-callout-text {
  flex: 1;
  line-height: 1.6;
}

.notion-toggle {
  margin: 12px 0;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.notion-toggle-summary {
  padding: 12px;
  cursor: pointer;
  background: #f9fafb;
  font-weight: 500;
  border-radius: 6px 6px 0 0;
}

.notion-toggle-content {
  padding: 12px;
}

.notion-list-item {
  margin: 6px 0;
  line-height: 1.6;
}

.notion-todo {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 6px 0;
}

.notion-checkbox {
  margin-top: 4px;
}

.notion-todo-text {
  flex: 1;
  line-height: 1.6;
}

.notion-code-block {
  margin: 16px 0;
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
}

.notion-code-block pre {
  margin: 0;
  color: #e2e8f0;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 14px;
}

.notion-inline-code {
  background: #f1f5f9;
  color: #db2777;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.9em;
}

.notion-divider {
  border: none;
  height: 1px;
  background: #e5e7eb;
  margin: 32px 0;
}

.notion-table-container {
  margin: 24px 0;
  overflow-x: auto;
}

.notion-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.notion-table-header {
  background: #f9fafb;
  font-weight: 600;
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
}

.notion-table-cell {
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
  border-right: 1px solid #f3f4f6;
  vertical-align: top;
}

.notion-column-list {
  display: flex;
  gap: 24px;
  margin: 24px 0;
}

.notion-column {
  flex: 1;
}

.notion-image, .notion-video, .notion-audio {
  margin: 24px 0;
  text-align: center;
}

.notion-image img, .notion-video video, .notion-audio audio {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.notion-image-caption, .notion-video-caption, .notion-audio-caption {
  margin-top: 8px;
  font-size: 14px;
  color: #6b7280;
  font-style: italic;
}

.notion-bookmark {
  margin: 16px 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.notion-bookmark a {
  display: block;
  text-decoration: none;
  color: inherit;
}

.notion-bookmark-content {
  padding: 16px;
}

.notion-bookmark-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.notion-bookmark-url {
  font-size: 14px;
  color: #6b7280;
}

.notion-file, .notion-pdf {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  margin: 8px 0;
}

.notion-equation {
  margin: 16px 0;
  text-align: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.notion-error {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #fecaca;
  margin: 12px 0;
}

/* 색상 클래스들 */
.notion-gray { color: #9B9A97; }
.notion-brown { color: #64473A; }
.notion-orange { color: #D9730D; }
.notion-yellow { color: #DFAB01; }
.notion-green { color: #0F7B6C; }
.notion-blue { color: #0B6E99; }
.notion-purple { color: #6940A5; }
.notion-pink { color: #AD1A72; }
.notion-red { color: #E03E3E; }

.notion-gray_background { background-color: #F1F1EF; }
.notion-brown_background { background-color: #F4EEEE; }
.notion-orange_background { background-color: #FAEBDD; }
.notion-yellow_background { background-color: #FBF3DB; }
.notion-green_background { background-color: #EDF3F0; }
.notion-blue_background { background-color: #E7F3F8; }
.notion-purple_background { background-color: #F6F3F9; }
.notion-pink_background { background-color: #FAF1F5; }
.notion-red_background { background-color: #FDEBEC; }
</style>
`;
    
    return cssStyles + content;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('페이지 내용 가져오기 실패:', errorMessage);
    return '<div class="notion-error">페이지 내용을 불러올 수 없습니다</div>';
  }
}

// 나머지 함수들 (기존 코드 유지)
export async function getPageMetadata(pageId: string) {
  validateEnv()
  
  try {
    return await notionClient.pages.retrieve({ page_id: pageId })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('페이지 조회 실패:', errorMessage);
    throw new Error('페이지 콘텐츠를 불러올 수 없습니다')
  }
}

export async function queryDatabase() {
  validateEnv()
  
  return notionClient.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    filter: { 
      property: 'Status',
      select: { equals: '발행됨' }
    },
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
  })
}

export async function getAllPosts(): Promise<Post[]> {
  validateEnv()
  
  try {
    let allResults: any[] = [];
    let hasMore = true;
    let nextCursor: string | null = null;
    
    while (hasMore) {
      const queryOptions: any = {
        database_id: process.env.NOTION_DATABASE_ID!,
        page_size: 100,
      };
      
      if (nextCursor) {
        queryOptions.start_cursor = nextCursor;
      }
      
      const response = await notionClient.databases.query(queryOptions);
      
      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
    }
    
    const publishedPosts = allResults.filter((page: any) => {
      const status = extractStatus(page.properties);
      return status === '발행됨' || status === 'Published';
    });
    
    return publishedPosts.map((page: any) => transformNotionPageToPost(page));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('게시물 가져오기 실패:', errorMessage);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  validateEnv()
  
  try {
    const response = await notionClient.databases.query({
      database_id: process.env.NOTION_DATABASE_ID!,
      filter: {
        property: 'Slug',
        rich_text: {
          equals: slug,
        },
      },
    });

    if (response.results.length === 0) {
      return null;
    }

    const page = response.results[0];
    const post = transformNotionPageToPost(page);
    const content = await getPageContent(page.id);

    return {
      ...post,
      content,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('게시물 가져오기 실패:', errorMessage);
    return null;
  }
}
