import React from 'react';
import Giscus from '@giscus/react';

export default function Comment() {
  return (
    <Giscus
      id="comments"
      repo="areumpark3/notion.blog" // 여기에 GitHub 사용자명/저장소명을 입력하세요
      repoId="R_kgDOOCzALA" // GitHub에서 제공하는 저장소 ID를 입력하세요
      category="Announcements" // 그대로 두거나 원하는 카테고리로 변경하세요
      categoryId="DIC_kwDOOCzALM4Cnm3V" // GitHub Discussions 카테고리 ID를 입력하세요
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
}

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
