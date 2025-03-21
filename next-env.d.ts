/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare module 'react-notion-x' {
    export const NotionRenderer: React.ComponentType<{
      recordMap: import('notion-types').ExtendedRecordMap
      components?: Partial<import('react-notion-x').NotionComponents>
      fullPage?: boolean
      darkMode?: boolean
    }>
  }

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
