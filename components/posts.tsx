//components/posts.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import postsData from '../content/posts';
import { Post } from '@/lib/notion-utils';

interface BlogPostsProps {
  initialPosts?: Post[] | any[];
}

export function BlogPosts({ initialPosts = [] }: BlogPostsProps) {
  // 서버에서 가져온 initialPosts가 있으면 사용, 없으면 로컬 데이터 사용
  const [posts, setPosts] = useState<Post[] | any[]>(
    initialPosts.length > 0 ? initialPosts : postsData
  );
  
  // 디버깅 로그
  useEffect(() => {
    if (initialPosts?.length > 0) {
      console.log(`[Client] 서버에서 받은 ${initialPosts.length}개의 게시물 사용`);
    } else {
      console.log('[Client] 로컬 게시물 데이터 사용');
    }
  }, [initialPosts]);

  // 게시물이 없는 경우 로컬 데이터 사용
  useEffect(() => {
    if (posts.length === 0 && postsData.length > 0) {
      console.log('[Client] 서버 데이터가 없어 로컬 데이터로 대체');
      setPosts(postsData);
    }
  }, [posts]);

  return (
    <div>
      {posts
        .sort((a, b) => {
          if (
            new Date(a.date) > new Date(b.date)
          ) {
            return -1
          }
          return 1
        })
        .map((post) => (
          <Link
            key={post.slug}
            className="flex flex-col space-y-1 mb-4"
            href={`/blog/${post.slug}`}
          >
            <div className="w-full flex flex-col md:flex-row space-x-0 md:space-x-2">
              <p className="text-neutral-600 dark:text-neutral-400 w-[100px] tabular-nums">
                {post.date}
              </p>
              <p className="text-neutral-900 dark:text-neutral-100 tracking-tight">
                {post.title}
              </p>
            </div>
          </Link>
        ))}
      
      {/* 게시물이 없는 경우 메시지 표시 */}
      {posts.length === 0 && (
        <p className="text-neutral-600 dark:text-neutral-400">
          현재 게시물이 없습니다. 곧 새로운 내용이 업데이트될 예정입니다.
        </p>
      )}
    </div>
  );
}
