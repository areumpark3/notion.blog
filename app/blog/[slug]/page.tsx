// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPosts, Post } from '@/lib/notion';

interface Props {
  params: {
    slug: string;
  };
}

export default async function PostPage({ params }: Props) {
  const post: Post | null = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <time className="text-gray-600" dateTime={post.date}>
          {new Date(post.date).toLocaleDateString('ko-KR')}
        </time>
      </header>
      
      <div className="prose prose-lg max-w-none">
        {/* 마크다운을 HTML로 변환하여 표시 */}
        <div 
          className="notion-content"
          dangerouslySetInnerHTML={{ 
            __html: convertMarkdownToHTML(post.content || '') 
          }} 
        />
      </div>
    </article>
  );
}

// 마크다운을 HTML로 변환하는 함수
function convertMarkdownToHTML(markdown: string): string {
  // 기본 마크다운 변환
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/~~(.*)~~/gim, '<del>$1</del>')
    .replace(/`(.*)`/gim, '<code>$1</code>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/---/gim, '<hr>')
    .replace(/\n\n/gim, '<br><br>');
}
