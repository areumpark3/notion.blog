import Image from 'next/image'
import { BlogPosts } from 'components/posts'
import { getPosts, Post } from '@/lib/notion-utils'

// ISR 설정
export const revalidate = 120;

export default async function Page() {
  // 환경 변수 확인 로깅
  console.log("NOTION_DATABASE_ID 존재:", !!process.env.NOTION_DATABASE_ID);
  console.log("NOTION_API_KEY 존재:", !!process.env.NOTION_API_KEY);
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // 명시적 타입 지정
  let posts: Post[] = [];
  try {
    posts = await getPosts();
    console.log(`[Server] 노션에서 ${posts.length}개의 게시물을 가져왔습니다`);
  } catch (error) {
    console.error('[Server] 노션 게시물 가져오기 실패:', error);
  }
  
  return (
    <section>
      <div className="flex items-center mb-8">
        <Image
          src="/profile.png"
          alt="profile image"
          width={100}
          height={100}
          className="rounded-full mr-4"
        />
        <div className="flex items-center justify-between w-full">
          <h1 className="text-2xl font-semibold tracking-tighter">
            솔루션파트 협업 노트
          </h1>
          <span className="text-sm text-gray-500 ml-4">{currentDate}</span>
        </div>
      </div>
      <p className="mb-4">
        {`오픈베이스 CX기술본부 솔루션파트의 업무 협업 블로그입니다.`}
        <br />
        {`해당 블로그에서 확인 가능한 내용은 다음과 같습니다.`}
        <br /> 
        {`고객사 정보, 작업 내용, SR 진행 현황 등 `}
      </p>
      <div className="my-8">
        <BlogPosts initialPosts={posts} />
      </div>
    </section>
  )
}
