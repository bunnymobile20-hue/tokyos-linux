import axios from 'axios';
import { logger } from './logger';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Resolve environment variables from ~/.clawos/.env
const homeDir = process.env.HOME || require('os').homedir();
const envPath = path.join(homeDir, '.clawos', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const MEM0_API_KEY = process.env.MEM0_API_KEY;

const mem0Client = axios.create({
  baseURL: 'https://api.mem0.ai/v1',
  headers: {
    'Authorization': `Token ${MEM0_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export const mem0 = {
  async addMemory(messages: any[], userId: string = 'bunny_dreams_user') {
    if (!MEM0_API_KEY) {
      logger.warn('MEM0_API_KEY não encontrada. Ignorando memória.', { module: 'Mem0' });
      return null;
    }
    try {
      const response = await mem0Client.post('/memories/', {
        messages,
        user_id: userId,
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Erro ao salvar memória: ${error.message}`, { module: 'Mem0' });
      return null;
    }
  },

  async getMemories(userId: string = 'bunny_dreams_user') {
    if (!MEM0_API_KEY) return [];
    try {
      const response = await mem0Client.get('/memories/', {
        params: { user_id: userId },
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Erro ao buscar memórias: ${error.message}`, { module: 'Mem0' });
      return [];
    }
  },

  async searchMemories(query: string, userId: string = 'bunny_dreams_user') {
    if (!MEM0_API_KEY) return [];
    try {
      const response = await mem0Client.post('/memories/search/', {
        query,
        user_id: userId,
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Erro ao buscar memórias: ${error.message}`, { module: 'Mem0' });
      return [];
    }
  }
};
