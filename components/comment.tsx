"use client";

import React from 'react';
import Giscus from '@giscus/react';

const Comment: React.FC = () => {
  return (
    <Giscus
      id="comments"
      repo="areumpark3/notion.blog"
      repoId="R_kgDOOCzALA"
      category="Announcements"
      categoryId="DIC_kwDOOCzALM4Cnm3V"
      mapping="pathname"
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="bottom"
      theme="preferred_color_scheme"
      lang="ko"
      loading="lazy"
    />
  );
};

export default Comment;


// To enable comments:
// 1. Uncomment this component
// 2. Update repo, repoId, and categoryId with your own giscus settings
// 3. Visit https://giscus.app to get your settings

// export default function Comment() {
//   return (
//     <Giscus
//       id="comments"
//       repo="" 
//       repoId=""
//       category="Announcements"
//       categoryId=""
//       mapping="pathname"
//       strict="0"
//       reactionsEnabled="1"
//       emitMetadata="0"
//       inputPosition="bottom"
//       theme="preferred_color_scheme"
//       lang="ko"
//       loading="lazy"
//     />
//   )
// }
