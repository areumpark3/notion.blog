// 자동 생성됨 - 2025-03-20T06:56:31.894Z
import { ExtendedRecordMap } from 'notion-types';
import post_1b1d9eed7ec68074b39cf659f4a10e8e from '../notion-data/post_1b1d9eed7ec68074b39cf659f4a10e8e.json';
import post_1b1d9eed7ec6808985d4e0257ea4c2ca from '../notion-data/post_1b1d9eed7ec6808985d4e0257ea4c2ca.json';
import post_1afd9eed7ec68041acc7f395d78b3126 from '../notion-data/post_1afd9eed7ec68041acc7f395d78b3126.json';

const posts = [
  {
    "title": "작업 기록",
    "slug": "post-1b1d9eed7ec68074b39cf659f4a10e8e",
    "content": post_1b1d9eed7ec68074b39cf659f4a10e8e,
    "date": "2025-03-09",
    "description": "",
    "notionPageId": "1b1d9eed7ec68074b39cf659f4a10e8e",
    "has_children": false
  },
  {
    "title": "고객사 정보",
    "slug": "post-1b1d9eed7ec6808985d4e0257ea4c2ca",
    "content": post_1b1d9eed7ec6808985d4e0257ea4c2ca,
    "date": "2025-03-18",
    "description": "",
    "notionPageId": "1b1d9eed7ec6808985d4e0257ea4c2ca",
    "has_children": false
  },
  {
    "title": "SR 내용 정리",
    "slug": "post-1afd9eed7ec68041acc7f395d78b3126",
    "content": post_1afd9eed7ec68041acc7f395d78b3126,
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
  content: { blocks: any[] };
  date: string;
  description: string;
  image?: string;
  notionPageId: string;
  has_children?: boolean;
  childPages?: { id: string; title: string; slug: string; }[];
  recordMap?: ExtendedRecordMap;
};