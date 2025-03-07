import post_1aed9eed7ec680e1b3add4856e48c459 from '../notion-data/post_1aed9eed7ec680e1b3add4856e48c459.json';
import post_1a1d9eed7ec680228a3ec54b7bd4db1a from '../notion-data/post_1a1d9eed7ec680228a3ec54b7bd4db1a.json';

const posts = [
  {
    "title": "윈도유3",
    "slug": "post-1aed9eed-7ec6-80e1-b3ad-d4856e48c459",
    "content": post_1aed9eed7ec680e1b3add4856e48c459,
    "date": "2025-03-07",
    "description": ""
  },
  {
    "title": "윈도우",
    "slug": "post-1a1d9eed-7ec6-8022-8a3e-c54b7bd4db1a",
    "content": post_1a1d9eed7ec680228a3ec54b7bd4db1a,
    "date": "2025-03-07",
    "description": ""
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
};