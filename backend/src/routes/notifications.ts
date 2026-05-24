import { Router } from 'express';
import { logger } from '../utils/logger';
import {
  clearNotifications,
  createSystemNotification,
  getUnreadNotificationCount,
  listSystemNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removeNotification,
  subscribeNotificationEvents,
} from '../services/notifications/service';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const includeRead = req.query.includeRead !== 'false';
    const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const data = await listSystemNotifications({ includeRead, appId, limit });
    res.json({ success: true, data });
  } catch (error) {
    logger.error(`notifications list failed: ${(error as Error).message}`, { module: 'Notifications' });
    res.status(500).json({ success: false, error: 'Falha ao ler a notificação' });
  }
});

router.get('/unread-count', async (_req, res) => {
  try {
    const unreadCount = await getUnreadNotificationCount();
    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    logger.error(`notifications unread-count failed: ${(error as Error).message}`, { module: 'Notifications' });
    res.status(500).json({ success: false, error: 'Falha ao ler a contagem de não lidas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body as {
      appId?: unknown;
      title?: unknown;
      message?: unknown;
      level?: unknown;
      metadata?: unknown;
    };

    if (typeof body.appId !== 'string' || typeof body.title !== 'string' || typeof body.message !== 'string') {
      return res.status(400).json({ success: false, error: 'appId/title/message é uma string obrigatória' });
    }

    if (body.level !== undefined && body.level !== 'info' && body.level !== 'success' && body.level !== 'warning' && body.level !== 'error') {
      return res.status(400).json({ success: false, error: 'level Suporta apenas info/success/warning/error' });
    }

    const metadata = body.metadata && typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : undefined;
    const data = await createSystemNotification({
      appId: body.appId,
      title: body.title,
      message: body.message,
      level: body.level as 'info' | 'success' | 'warning' | 'error' | undefined,
      metadata,
    });

    res.json({ success: true, data });
  } catch (error) {
    const message = (error as Error).message || 'Falha ao criar notificação';
    const status = message.includes('não pode estar vazio') ? 400 : 500;
    logger.error(`notifications create failed: ${message}`, { module: 'Notifications' });
    res.status(status).json({ success: false, error: message });
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    const data = await markNotificationRead(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Notificação não existe' });
    }
    res.json({ success: true, data });
  } catch (error) {
    logger.error(`notifications mark read failed: ${(error as Error).message}`, { module: 'Notifications' });
    res.status(500).json({ success: false, error: 'Falha na notificação de atualização' });
  }
});

router.post('/read-all', async (_req, res) => {
  try {
    const updatedCount = await markAllNotificationsRead();
    res.json({ success: true, data: { updatedCount } });
  } catch (error) {
    logger.error(`notifications read-all failed: ${(error as Error).message}`, { module: 'Notifications' });
    res.status(500).json({ success: false, error: 'Falha na leitura do lote' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const removed = await removeNotification(req.params.id);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Notificação não existe' });
    }
    res.json({ success: true, data: { removed: true } });
  } catch (error) {
    logger.error(`notifications remove failed: ${(error as Error).message}`, { module: 'Notifications' });
    res.status(500).json({ success: false, error: 'Falha ao excluir notificação' });
  }
});

router.delete('/', async (_req, res) => {
  try {
    await clearNotifications();
    res.json({ success: true, data: { cleared: true } });
  } catch (error) {
    logger.error(`notifications clear failed: ${(error as Error).message}`, { module: 'Notifications' });
    res.status(500).json({ success: false, error: 'Falha ao limpar a notificação' });
  }
});

router.get('/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event: string, payload: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const notifications = await listSystemNotifications({ includeRead: true, limit: 50 });
    const unreadCount = await getUnreadNotificationCount();
    send('snapshot', { notifications, unreadCount });
  } catch (error) {
    logger.error(`notifications stream snapshot failed: ${(error as Error).message}`, { module: 'Notifications' });
    send('error', { message: 'Falha ao inicializar o fluxo de notificação' });
  }

  const unsubscribe = subscribeNotificationEvents((payload) => {
    send('change', payload);
  });

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export default router;
