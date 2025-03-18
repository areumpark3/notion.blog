// app/blog/[slug]/metadata.tsx
import { Metadata } from 'next';
import { baseUrl } from 'app/sitemap';
import posts from 'content/posts';

// 수정: NextJS 15.2.1 generateMetadata 함수 형식에 맞게 수정
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params;
  const post = posts.find((post) => post.slug === slug);

  if (!post) {
    return {
      title: '페이지를 찾을 수 없습니다',
      description: '요청하신 페이지가 존재하지 않습니다.'
    };
  }

  let {
    title,
    date: publishedTime,
    description,
    image,
  } = post;
  
  let ogImage = image
    ? image
    : `${baseUrl}/og?title=${encodeURIComponent(title)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime,
      url: `${baseUrl}/blog/${post.slug}`,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
