import * as fs from 'fs';
import * as path from 'path';

/**
 * MemoryManager - Dual Engine (SQLite + Obsidian Vault)
 * Handles writing to the file system as markdown for the Obsidian-style vault.
 */

const MEMORY_BASE_PATH = '/media/tokio/_dde_home/tokyo-os/memory';

export interface MemoryEntry {
  title: string;
  category: 'bunny_dreams' | 'processos' | 'decisoes' | 'metas' | 'lojas' | 'funcionarios_virtuais' | 'valores';
  content: string;
  tags?: string[];
}

function getMemoryFilePath(category: string): string {
  return path.join(MEMORY_BASE_PATH, `${category}.md`);
}

export function saveToMemoryVault(entry: MemoryEntry): void {
  try {
    if (!fs.existsSync(MEMORY_BASE_PATH)) {
      fs.mkdirSync(MEMORY_BASE_PATH, { recursive: true });
    }

    const filePath = getMemoryFilePath(entry.category);
    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
    const tagsStr = entry.tags && entry.tags.length > 0 ? `\nTags: ${entry.tags.map(t => `#${t}`).join(', ')}` : '';
    
    const mdBlock = `
## [${dateStr}] ${entry.title}
*Adicionado em: ${timestamp}*${tagsStr}

${entry.content}

---
`;

    fs.appendFileSync(filePath, mdBlock, 'utf8');
  } catch (error) {
    console.error(`[MemoryManager] Erro ao salvar memória no vault:`, error);
  }
}
