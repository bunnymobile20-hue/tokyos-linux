import { Router } from 'express';
import { paperclipManager } from '../services/paperclipManager';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

router.get('/agents', async (req, res) => {
  try {
    const agents = await paperclipManager.getAgents();
    res.json({ success: true, data: agents });
  } catch (error: any) {
    logger.error(`Paperclip Get Agents Error: ${error.message}`, { module: 'Paperclip' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/agents', async (req, res) => {
  try {
    const agent = req.body;
    await paperclipManager.updateAgent(agent);
    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Paperclip Update Agent Error: ${error.message}`, { module: 'Paperclip' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const tasks = await paperclipManager.getTasks();
    res.json({ success: true, data: tasks });
  } catch (error: any) {
    logger.error(`Paperclip Get Tasks Error: ${error.message}`, { module: 'Paperclip' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const { agent_id, description } = req.body;
    const task = {
      id: crypto.randomUUID(),
      agent_id,
      description,
      status: 'todo' as const,
      delivery_log: '',
      created_at: Date.now()
    };
    await paperclipManager.createTask(task);
    res.json({ success: true, data: task });
  } catch (error: any) {
    logger.error(`Paperclip Create Task Error: ${error.message}`, { module: 'Paperclip' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tasks/:id/status', async (req, res) => {
  try {
    const { status, log } = req.body;
    await paperclipManager.updateTaskStatus(req.params.id, status, log || '');
    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Paperclip Update Task Status Error: ${error.message}`, { module: 'Paperclip' });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
