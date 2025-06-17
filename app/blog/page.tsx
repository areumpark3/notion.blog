// app/page.tsx
import { getAllPosts, Post } from '@/lib/notion';

// getStaticProps 완전 제거
export default async function Home() {
  // 컴포넌트에서 직접 데이터 페칭
  const posts: Post[] = await getAllPosts();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">CX솔루션 협업 게시물</h1>
      
      {posts.length === 0 ? (
        <p className="text-gray-600">게시물이 없습니다.</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post: Post) => (
            <article key={post.id} className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-2">
                <a href={`/blog/${post.slug}`} className="hover:text-blue-600">
                  {post.title}
                </a>
              </h2>
              <p className="text-gray-600 text-sm">
                {new Date(post.date).toLocaleDateString('ko-KR')}
              </p>
              {post.status && (
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  {post.status}
                </span>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// 캐싱 및 재검증 설정 (선택사항)
export const revalidate = 60; // 60초마다 재검증
