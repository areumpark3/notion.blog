// content/guide.ts
import { ExtendedRecordMap } from 'notion-types';

// JSON 파일 임포트 제거 (파일이 존재하지 않음)
// 대신 빈 블록 객체 사용
const emptyContent = { blocks: [] };

// 기존 블로그 포스트 중 하나를 가이드로 임시 사용
export const kr = {
  title: "노션을 활용해서 나만의 블로그 만들기 대공개",
  content: emptyContent,
  description: "NotionPresso를 사용하여 노으로 쉽고 빠르게 블로그를 만드는 방법을 안내하는 가이드",
  image: undefined,
  notionPageId: "1a1d9eed7ec680228a3ec54b7bd4db1a"
}

export const en = {
  title: "NotionPresso Blog Template Guide",
  content: emptyContent,
  description: "A comprehensive guide on creating your own blog quickly and easily using NotionPresso with Notion",
  image: undefined,
  notionPageId: "1a1d9eed7ec680228a3ec54b7bd4db1a"
}

export default kr;
