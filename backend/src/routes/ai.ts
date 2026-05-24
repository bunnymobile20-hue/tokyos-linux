import { Router } from 'express';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = Router();
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

// Helper to check if Ollama is accessible
async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const headers: any = {};
    if (process.env.OLLAMA_API_KEY) headers['Authorization'] = `Bearer ${process.env.OLLAMA_API_KEY}`;
    const res = await fetch(`${OLLAMA_HOST}/`, { headers });
    return res.ok || res.status === 200;
  } catch {
    return false;
  }
}

// /api/system/ai/models - List all available models
router.get('/models', async (req, res) => {
  try {
    let allModels: any[] = [];
    let isOnline = false;

    // 1. Fetch Ollama Models
    const isUp = await checkOllamaAvailability();
    if (isUp) {
      isOnline = true;
      try {
        const headers: any = {};
        if (process.env.OLLAMA_API_KEY) headers['Authorization'] = `Bearer ${process.env.OLLAMA_API_KEY}`;
        const response = await fetch(`${OLLAMA_HOST}/api/tags`, { headers });
        if (response.ok) {
          const data = await response.json();
          const ollamaModels = (data.models || []).map((m: any) => ({
            ...m,
            provider: 'Ollama (Local)'
          }));
          allModels = [...allModels, ...ollamaModels];
        }
      } catch (e) {
        logger.error(`Ollama Tags Fetch Error: ${e}`);
      }
    }

    // 2. Fetch NVIDIA NIM Models
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (nvidiaKey) {
      isOnline = true;
      try {
        const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${nvidiaKey}`,
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          const nvidiaModels = (data.data || []).map((m: any) => ({
            name: m.id,
            model: m.id,
            provider: 'NVIDIA NIM (Cloud/Local)',
            details: { family: 'nvidia', parameter_size: 'unknown' }
          }));
          allModels = [...allModels, ...nvidiaModels];
        }
      } catch (e) {
        logger.error(`NVIDIA API Models Fetch Error: ${e}`);
      }
    }

    res.json({ success: true, isOnline, models: allModels });
  } catch (error: any) {
    logger.error(`AI Models Fetch Error: ${error.message}`, { module: 'TokyoAI' });
    res.status(500).json({ success: false, isOnline: false, error: error.message });
  }
});

// /api/system/ai/status - List currently loaded models (RAM/VRAM)
router.get('/status', async (req, res) => {
  try {
    const isUp = await checkOllamaAvailability();
    if (!isUp) {
      return res.json({ success: true, isOnline: false, loadedModels: [] });
    }

    const headers: any = {};
    if (process.env.OLLAMA_API_KEY) headers['Authorization'] = `Bearer ${process.env.OLLAMA_API_KEY}`;
    const response = await fetch(`${OLLAMA_HOST}/api/ps`, { headers });
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ success: true, isOnline: true, loadedModels: data.models || [] });
  } catch (error: any) {
    logger.error(`Ollama PS Fetch Error: ${error.message}`, { module: 'TokyoAI' });
    res.status(500).json({ success: false, isOnline: false, error: error.message });
  }
});


// --- Gemini Cloud Metrics ---
const getCostFile = () => {
  const homeDir = os.homedir();
  return path.join(homeDir, '.clawos', 'ai_costs.json');
};

router.get('/gemini/usage', async (req, res) => {
  try {
    const costFile = getCostFile();
    let data = { total_sessions: 0, total_seconds: 0, estimated_cost_usd: 0 };
    try {
      const content = await fs.readFile(costFile, 'utf8');
      data = JSON.parse(content);
    } catch (e) {
      // ignore, file doesn't exist yet
    }
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Gemini Usage Fetch Error: ${error.message}`, { module: 'TokyoAI' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gemini/track', async (req, res) => {
  try {
    const { seconds = 0 } = req.body;
    if (typeof seconds !== 'number') {
      return res.status(400).json({ error: 'Seconds must be a number' });
    }

    const costFile = getCostFile();
    let data = { total_sessions: 0, total_seconds: 0, estimated_cost_usd: 0 };
    try {
      const content = await fs.readFile(costFile, 'utf8');
      data = JSON.parse(content);
    } catch (e) {
      // ensure dir exists
      try { await fs.mkdir(path.dirname(costFile), { recursive: true }); } catch (_) {}
    }

    data.total_sessions += 1;
    data.total_seconds += seconds;
    // Rough estimate: Gemini realtime API cost $0.06 per minute of audio. Let's say $0.001 per second.
    data.estimated_cost_usd += (seconds * 0.001);

    await fs.writeFile(costFile, JSON.stringify(data, null, 2), 'utf8');
    
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Gemini Track Error: ${error.message}`, { module: 'TokyoAI' });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
