// content/posts.ts
import { ExtendedRecordMap } from 'notion-types';

// JSON 파일 임포트 제거 (파일이 존재하지 않음)
// 대신 빈 블록 객체 사용
const emptyBlocks = { blocks: [] };

const posts = [
  {
    "title": "작업 기록",
    "slug": "post-1b1d9eed7ec68074b39cf659f4a10e8e",
    "content": emptyBlocks,
    "date": "2025-03-09",
    "description": "",
    "notionPageId": "1b1d9eed7ec68074b39cf659f4a10e8e",
    "has_children": true
  },
  {
    "title": "고객사 정보",
    "slug": "post-1b1d9eed7ec6808985d4e0257ea4c2ca",
    "content": emptyBlocks,
    "date": "2025-03-09",
    "description": "",
    "notionPageId": "1b1d9eed7ec6808985d4e0257ea4c2ca",
    "has_children": true
  },
  {
    "title": "최신 뉴스",
    "slug": "post-1b1d9eed7ec68039b927c2d14c957fc9",
    "content": emptyBlocks,
    "date": "2025-03-09",
    "description": "",
    "notionPageId": "1b1d9eed7ec68039b927c2d14c957fc9",
    "has_children": false
  },
  {
    "title": "SR 내용 정리",
    "slug": "post-1afd9eed7ec68041acc7f395d78b3126",
    "content": emptyBlocks,
    "date": "2025-03-09",
    "description": "",
    "notionPageId": "1afd9eed7ec68041acc7f395d78b3126",
    "has_children": false
  }
] as Post[];

export default posts;

export type Post = {
  title: string;
  slug: string;
  content?: { blocks: any[] }; // 선택적 속성으로 변경
  date: string;
  description: string;
  image?: string;
  notionPageId: string;
  has_children?: boolean;
  childPages?: { id: string; title: string; slug: string; }[];
  recordMap?: ExtendedRecordMap;
};
