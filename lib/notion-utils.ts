//lib\notion-utils.ts

import { Client } from '@notionhq/client';
import type { ListBlockChildrenResponse } from '@notionhq/client/build/src/api-endpoints';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function fetchAllBlocks(blockId: string): Promise<ListBlockChildrenResponse['results']> {
  let blocks: ListBlockChildrenResponse['results'] = [];
  let cursor: string | null = null;

  while (true) {
    try {
      const response = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor ?? undefined,
      });

      blocks.push(...response.results);

      if (!response.has_more) break;

      cursor = response.next_cursor;
    } catch (error) {
      console.error(`Error fetching blocks for block ID ${blockId}:`, error);
      break;
    }
  }

  return blocks;
}

