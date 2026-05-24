import { Router } from 'express';
import { getServerPaths, getServerUiConfig, loadServerConfig, saveServerConfig, updateServerPaths, updateServerUiConfig } from '../utils/serverConfig';
import { readEnvVariables, updateEnvVariables } from '../utils/envManager';

const router = Router();

router.get('/', async (req, res) => {
  const config = await loadServerConfig();
  res.json({ success: true, data: config });
});

router.post('/', async (req, res) => {
  const newConfig = req.body;
  const updated = await saveServerConfig(newConfig);
  res.json({ success: true, data: updated });
});

router.get('/paths', async (_req, res) => {
  const paths = await getServerPaths();
  res.json({ success: true, data: paths });
});

router.post('/paths', async (req, res) => {
  const paths = await updateServerPaths(req.body || {});
  res.json({ success: true, data: paths });
});

router.get('/ui', async (_req, res) => {
  const ui = await getServerUiConfig();
  res.json({ success: true, data: ui });
});

router.post('/ui', async (req, res) => {
  const ui = await updateServerUiConfig(req.body || {});
  res.json({ success: true, data: ui });
});

router.get('/env', async (_req, res) => {
  const env = await readEnvVariables();
  res.json({ success: true, data: env });
});

router.post('/env', async (req, res) => {
  const success = await updateEnvVariables(req.body || {});
  if (success) {
    const env = await readEnvVariables();
    res.json({ success: true, data: env });
  } else {
    res.status(500).json({ success: false, error: 'Failed to update .env' });
  }
});

export default router;
