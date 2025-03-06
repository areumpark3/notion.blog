import post1 from '../notion-data/126ce18c-fd83-8023-9ad1-d0e1809b21c3.json'
import post2 from '../notion-data/127ce18c-fd83-805c-bebd-d6772e18bf02.json'

const posts = [
  {
    title: "작업 내역 상세",
    slug: "api-design-in-bff",
    content: post1,
    date: "2023-10-22",
    description: "업무 진행 현황 및 작업 진행 내용 등 업로드 ",
    image: undefined
  },
  {
    title: "SR 진행 내용",
    slug: "naver-search-bar-ux",
    content: post2,
    date: "2023-10-23",
    description: "vSphere 관련 SR 진행한 내용 등 업로드 ",
    image: undefined
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
