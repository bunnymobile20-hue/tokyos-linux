import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import { logger } from './logger';

const getEnvPath = () => path.join(os.homedir(), '.clawos', '.env');

export async function readEnvVariables(): Promise<Record<string, string>> {
  const envPath = getEnvPath();
  try {
    const content = await fs.readFile(envPath, 'utf8');
    return dotenv.parse(content);
  } catch (error: any) {
    logger.warn(`Could not read .env file at ${envPath}: ${error.message}`);
    return {};
  }
}

export async function updateEnvVariables(updates: Record<string, string>): Promise<boolean> {
  const envPath = getEnvPath();
  try {
    let content = '';
    try {
      content = await fs.readFile(envPath, 'utf8');
    } catch {
      // File doesn't exist, start fresh
    }

    const lines = content.split('\n');
    const updatedKeys = new Set<string>();

    const newLines = lines.map(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        if (key in updates) {
          updatedKeys.add(key);
          const val = updates[key];
          // Wrap in quotes if it contains spaces or special characters
          const safeVal = val.includes(' ') || val.includes('"') || val.includes("'") ? `"${val.replace(/"/g, '\\"')}"` : val;
          return `${key}=${safeVal}`;
        }
      }
      return line;
    });

    for (const [key, val] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        const safeVal = val.includes(' ') || val.includes('"') || val.includes("'") ? `"${val.replace(/"/g, '\\"')}"` : val;
        newLines.push(`${key}=${safeVal}`);
      }
    }

    await fs.writeFile(envPath, newLines.join('\n'), 'utf8');
    return true;
  } catch (error: any) {
    logger.error(`Error updating .env file at ${envPath}: ${error.message}`);
    return false;
  }
}
