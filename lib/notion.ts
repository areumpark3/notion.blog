// lib/notion.ts
const validateEnv = () => {
  const { NOTION_API_KEY, NOTION_DATABASE_ID } = process.env;
  
  if (!NOTION_API_KEY?.startsWith('ntn_')) {
    throw new Error('유효하지 않은 NOTION_API_KEY 형식입니다.');
  }
  
  if (!NOTION_DATABASE_ID || !/^[0-9a-f]{32}$/.test(NOTION_DATABASE_ID)) {
    throw new Error('유효하지 않은 NOTION_DATABASE_ID 형식입니다.');
  }
};

export const config = {
  notionAPIKey: process.env.NOTION_API_KEY as string, // 타입 단언
  databaseId: process.env.NOTION_DATABASE_ID as string, // 타입 단언
  validateEnv
};
