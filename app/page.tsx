import Image from 'next/image'
import { BlogPosts } from 'components/posts'

export default function Page() {
  // 현재 날짜를 가져오고 포맷팅합니다.
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
        <BlogPosts />
      </div>
    </section>
  )
}
