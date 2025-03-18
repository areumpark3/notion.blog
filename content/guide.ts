// content/guide.ts
import post_1a1d9eed7ec680228a3ec54b7bd4db1a from '../notion-data/post_1a1d9eed7ec680228a3ec54b7bd4db1a.json';

// 기존 블로그 포스트 중 하나를 가이드로 임시 사용
export const kr = {
  title: "노션을 활용해서 나만의 블로그 만들기 대공개",
  content: post_1a1d9eed7ec680228a3ec54b7bd4db1a as { blocks: any[] },
  description: "NotionPresso를 사용하여 노으로 쉽고 빠르게 블로그를 만드는 방법을 안내하는 가이드",
  image: undefined,
  notionPageId: "1a1d9eed7ec680228a3ec54b7bd4db1a" // 노션 페이지 ID 추가
}

export const en = {
  title: "NotionPresso Blog Template Guide",
  content: post_1a1d9eed7ec680228a3ec54b7bd4db1a as { blocks: any[] },
  description: "A comprehensive guide on creating your own blog quickly and easily using NotionPresso with Notion",
  image: undefined,
  notionPageId: "1a1d9eed7ec680228a3ec54b7bd4db1a" // 노션 페이지 ID 추가
}

export default en;
