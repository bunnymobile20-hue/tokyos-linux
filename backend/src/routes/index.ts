import { Router } from 'express';
import { getHardwareStats, getMonitoredServices, getNetworkStats, getOpenClawBackupStatus, getResticBackupStatus, getSecuritySurfaceStatus, getTimeshiftStatus, MonitoredServiceDefinition } from '../utils/probe';
import { logger } from '../utils/logger';
import { getAria2Secret } from '../utils/localServices';
import { getOpenCodeBasicAuthHeader } from '../utils/opencodeService';

import fs from 'fs/promises';
import path from 'path';
import { createNoteInDir, deleteNoteFromDir, readNotesDir, getNotesTree, saveNoteAsset, updateNoteInDir, createFolder, deleteFolder, renameFolder, moveNote } from '../utils/notesStore';
import { DEFAULT_SERVER_PATHS, getServerPaths } from '../utils/serverConfig';

// Resolve password for health checks
function resolveClawosPassword(): string {
  const envPassword = process.env.CLAWOS_PASSWORD?.trim();
  if (envPassword) {
    return envPassword;
  }

  const homeDir = process.env.HOME?.trim() || require('os').homedir();
  const clawosEnvPath = path.join(homeDir, '.clawos', '.env');
  try {
    const dotenv = require('dotenv');
    const parsedEnv = dotenv.parse(require('fs').readFileSync(clawosEnvPath, 'utf8'));
    return parsedEnv.CLAWOS_PASSWORD?.trim() ?? '';
  } catch {
    return '';
  }
}

const CLAWOS_PASSWORD = resolveClawosPassword();

import downloadRoutes from './downloads';
import netdiskRoutes from './netdisk';
import musicRoutes from './music';
import localmusicRoutes from './localmusic';
import videoRoutes from './video';

import cronRoutes from './cron';
import readerRoutes from './reader';
import configRoutes from './config';
import speedtestRoutes from './speedtest';
import stockAnalysisRoutes from './stock-analysis';
import didaRoutes from './dida';
import notificationsRoutes from './notifications';
import opencodeRoutes from './opencode';
import aiRoutes from './ai';
import paperclipRoutes from './paperclip';
import openclawRoutes from './openclaw';
import hermesRoutes from './hermes';
import firecrawlRoutes from './firecrawl';
import antigravityRoutes from './antigravity';
import executionRoutes from './execution';

const router = Router();

const getNotesDir = async (req: any) => {
  const queryDir = typeof req.query?.dir === 'string' ? req.query.dir : '';
  const bodyDir = typeof req.body?.dir === 'string' ? req.body.dir : '';
  const customDir = queryDir || bodyDir;
  if (customDir) {
    return customDir;
  }
  const paths = await getServerPaths();
  return paths.notesDir;
};

const monitoredServices: MonitoredServiceDefinition[] = [
  {
    id: 'clawos',
    unit: 'clawos.service',
    description: 'ClawOS Interface principal e entrada do sistema。ele trava，A página inteira da web que você vê na sua área de trabalho não pode ser aberta.。',
    kind: 'core',
    healthCheck: {
      type: 'http',
      url: 'http://127.0.0.1:3001/api/system/hardware',
      expectedText: '"success":true',
      successMessage: 'A interface backend da interface principal responde normalmente'
    }
  },
  {
    id: 'filebrowser',
    unit: 'clawos-filebrowser.service',
    description: 'ClawOS Back-end do gerenciador de arquivos。Usado para navegar por arquivos、Abra diretórios e gerencie arquivos locais。',
    kind: 'core',
    healthCheck: {
      type: 'http',
      url: 'http://127.0.0.1:18790/',
      expectedText: 'File Browser',
      successMessage: 'A interface de gerenciamento de arquivos pode ser aberta normalmente'
    }
  },
  {
    id: 'openclaw',
    unit: 'openclaw-gateway.service',
    description: 'OpenClaw AI porta de entrada。Responsável AI Diálogo e habilidades relacionadas，se é anormal，AI A função ficará indisponível。',
    kind: 'core',
    healthCheck: {
      type: 'http',
      url: 'http://127.0.0.1:18789/',
      expectedText: 'OpenClaw Control',
      successMessage: 'AI A página do gateway pode ser acessada normalmente'
    }
  },
  {
    id: 'opencode',
    unit: 'opencode-web.service',
    description: 'OpenCode Web front-end。usado em ClawOS Opere a máquina remotamente OpenCode，Será protegido pela verificação em duas etapas do App Lock。',
    kind: 'core',
    healthCheck: {
      type: 'http',
      url: 'http://127.0.0.1:4096/global/health',
      expectedText: 'healthy',
      authHeader: getOpenCodeBasicAuthHeader(),
      successMessage: 'OpenCode Web A interface responde normalmente'
    }
  },
  {
    id: 'aria2',
    unit: 'clawos-aria2.service',
    description: 'Baixar plano de fundo do mecanismo。Filme、Música e tarefas gerais de download dependem dela para realmente funcionar。',
    kind: 'core',
    healthCheck: {
      type: 'jsonrpc',
      url: 'http://127.0.0.1:6800/jsonrpc',
      method: 'aria2.getVersion',
      params: [`token:${getAria2Secret()}`],
      successMessage: 'mecanismo de download RPC A resposta é normal'
    }
  },
  {
    id: 'alist',
    unit: 'clawos-alist.service',
    description: 'Fundo de montagem de disco de rede。O Baidu Netdisk e o Quark Netdisk podem ser navegados normalmente?、download，Principalmente olhe para isso。',
    kind: 'core',
    healthCheck: {
      type: 'http',
      url: 'http://127.0.0.1:5244/api/public/settings',
      expectedText: 'code',
      successMessage: 'A interface de fundo de montagem do disco de rede responde normalmente'
    }
  },
  {
    id: 'display-inhibit',
    unit: 'clawos-display-inhibit.service',
    description: 'Processo anti-dormente keep-alive。Tente evitar uma tela preta ao usá-lo remotamente、A tela ou display de bloqueio entra em suspensão。',
    kind: 'core'
  },
  {
    id: 'clawos-watchdog',
    unit: 'clawos-watchdog.timer',
    description: 'ClawOS Temporizador de inspeção automático。Verificará regularmente se o serviço da interface principal ainda está ativo，e tente consertar isso automaticamente。',
    kind: 'watchdog'
  },
  {
    id: 'clawos-display-watchdog',
    unit: 'clawos-display-watchdog.timer',
    description: 'Exibir remotamente o temporizador de inspeção。Verificará regularmente se o keep-alive do display remoto está normal，Reduza o problema de tela preta remota。',
    kind: 'watchdog'
  },
  {
    id: 'openclaw-watchdog',
    unit: 'openclaw-watchdog.timer',
    description: 'OpenClaw Temporizador de inspeção automático。Irá verificar regularmente AI O gateway está normal?，e tente consertar quando ocorrerem exceções。',
    kind: 'watchdog'
  }
];

// /api/system/network
router.get('/network', async (req, res) => {
  try {
    const stats = await getNetworkStats();
    res.json({ success: true, data: stats, error: null });
  } catch (error: any) {
    logger.error(`Network Probe Error: ${error.message}`, { module: 'SystemProbe' });
    res.status(500).json({ success: false, data: null, error: error.message });
  }
});

// /api/system/hardware
router.get('/hardware', async (req, res) => {
  try {
    const stats = await getHardwareStats();
    res.json({ success: true, data: stats, error: null });
  } catch (error: any) {
    logger.error(`Hardware Probe Error: ${error.message}`, { module: 'SystemProbe' });
    res.status(500).json({ success: false, data: null, error: error.message });
  }
});

// /api/system/services
router.get('/services', async (req, res) => {
  try {
    const services = await getMonitoredServices(monitoredServices, CLAWOS_PASSWORD);

    res.json({ success: true, data: services, error: null });
  } catch (error: any) {
    logger.error(`Services Probe Error: ${error.message}`, { module: 'SystemProbe' });
    res.status(500).json({ success: false, data: null, error: error.message });
  }
});

// /api/system/timeshift
router.get('/timeshift', async (req, res) => {
  try {
    const status = await getTimeshiftStatus();
    res.json({ success: true, data: status, error: null });
  } catch (error: any) {
    logger.error(`Timeshift Probe Error: ${error.message}`, { module: 'SystemProbe' });
    res.status(500).json({ success: false, data: null, error: error.message });
  }
});

router.get('/openclaw-backup', async (_req, res) => {
  try {
    const status = await getOpenClawBackupStatus();
    res.json({ success: true, data: status, error: null });
  } catch (error: any) {
    logger.error(`OpenClaw Backup Probe Error: ${error.message}`, { module: 'SystemProbe' });
    res.status(500).json({ success: false, data: null, error: error.message });
  }
});

router.get('/restic-backup', async (_req, res) => {
  try {
    const status = await getResticBackupStatus();
    res.json({ success: true, data: status, error: null });
  } catch (error: any) {
    logger.error(`Restic Backup Probe Error: ${error.message}`, { module: 'SystemProbe' });
    res.status(500).json({ success: false, data: null, error: error.message });
  }
});

router.get('/security-surface', async (_req, res) => {
  try {
    const status = await getSecuritySurfaceStatus();
    res.json({ success: true, data: status, error: null });
  } catch (error: any) {
    logger.error(`Security Surface Probe Error: ${error.message}`, { module: 'SystemProbe' });
    res.status(500).json({ success: false, data: null, error: error.message });
  }
});

// /api/system/deep-status
router.get('/deep-status', async (_req, res) => {
  try {
    const { execSync } = require('child_process');
    let ram = "Unknown";
    let disk = "Unknown";
    try {
      ram = execSync("free -m | awk 'NR==2{printf \"Total: %sMB, Usado: %sMB (%.2f%%)\", $2, $3, $3*100/$2 }'").toString().trim();
      disk = execSync("df -h / | awk 'NR==2{printf \"Total: %s, Usado: %s (%s)\", $2, $3, $5}'").toString().trim();
    } catch (e) {}

    let lastErrors = "";
    try {
      const fs = require('fs');
      const errLog = '/home/tokio/TokiOS/logs/startup_errors.log';
      if (fs.existsSync(errLog)) {
        lastErrors = execSync(`tail -n 5 ${errLog}`).toString().trim();
      }
    } catch (e) {}

    res.json({ 
      success: true, 
      data: {
        ram,
        disk,
        lastErrors,
        tokyos_version: "1.0-MintIntegration"
      }, 
      error: null 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, data: null, error: error.message });
  }
});

// --- Notes API ---
// /api/system/notes
router.get('/notes', async (req, res) => {
  try {
    const notesDir = await getNotesDir(req);
    const notes = await readNotesDir(notesDir);
    res.json({ success: true, data: notes });
  } catch (error: any) {
    logger.error(`Notes Read Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/notes/tree', async (req, res) => {
  try {
    const notesDir = await getNotesDir(req);
    const tree = await getNotesTree(notesDir);
    res.json({ success: true, data: tree });
  } catch (error: any) {
    logger.error(`Notes Tree Read Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/notes', async (req, res) => {
  try {
    const notesDir = await getNotesDir(req);
    const newNote = {
      id: Date.now().toString(),
      title: req.body.title || 'Nota sem título',
      date: new Date().toISOString().split('T')[0],
      content: req.body.content || '',
      updatedAt: new Date().toISOString(),
      folder: req.body.folder || ''
    };

    const createdNote = await createNoteInDir(notesDir, newNote);
    
    res.json({ success: true, data: createdNote });
  } catch (error: any) {
    logger.error(`Notes Create Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/notes/folders', async (req, res) => {
  try {
    const notesDir = await getNotesDir(req);
    const folderPath = req.body.path;
    if (!folderPath) {
      return res.status(400).json({ success: false, error: 'Folder path is required' });
    }

    await createFolder(notesDir, folderPath);
    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Notes Folder Create Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/notes/folders/rename', async (req, res) => {
  try {
    const notesDir = await getNotesDir(req);
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ success: false, error: 'Both oldPath and newPath are required' });
    }

    await renameFolder(notesDir, oldPath, newPath);
    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Notes Folder Rename Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/notes/folders', async (req, res) => {
  try {
    const notesDir = await getNotesDir(req);
    const folderPath = req.body.path || req.query.path;
    if (!folderPath) {
      return res.status(400).json({ success: false, error: 'Folder path is required' });
    }

    await deleteFolder(notesDir, folderPath as string);
    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Notes Folder Delete Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/notes/:id/move', async (req, res) => {
  try {
    const notesDir = await getNotesDir(req);
    const newFolder = req.body.folder || '';
    
    const movedNote = await moveNote(notesDir, req.params.id, newFolder);
    if (!movedNote) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({ success: true, data: movedNote });
  } catch (error: any) {
    logger.error(`Notes Move Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/notes/:id', async (req, res) => {
  try {
    const notesDir = await getNotesDir(req);
    const notes = await readNotesDir(notesDir);

    const index = notes.findIndex((n: any) => n.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const updatedNote = {
      ...notes[index],
      title: req.body.title !== undefined ? req.body.title : notes[index].title,
      content: req.body.content !== undefined ? req.body.content : notes[index].content,
      folder: req.body.folder !== undefined ? req.body.folder : notes[index].folder,
      updatedAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    };

    const savedNote = await updateNoteInDir(notesDir, updatedNote);
    res.json({ success: true, data: savedNote });
  } catch (error: any) {
    logger.error(`Notes Update Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    const notesDir = await getNotesDir(req);
    await deleteNoteFromDir(notesDir, req.params.id);
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Notes Delete Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/notes/migrate', async (req, res) => {
  const fromDir = req.body.fromDir || '';
  const toDir = req.body.toDir || '';

  if (!toDir) {
    return res.status(400).json({ success: false, error: 'Target notes directory is required' });
  }

  const serverPaths = await getServerPaths();
  const fromNotesDir = fromDir || serverPaths.notesDir || DEFAULT_SERVER_PATHS.notesDir;
  const toNotesDir = toDir;

  try {
    const [sourceNotes, targetNotes] = await Promise.all([
      readNotesDir(fromNotesDir),
      readNotesDir(toNotesDir)
    ]);

    const noteMap = new Map<string, any>();
    [...targetNotes, ...sourceNotes].forEach((note: any) => {
      noteMap.set(note.id, note);
    });

    const mergedNotes = [...noteMap.values()].sort((left, right) => {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

    await Promise.all(mergedNotes.map((note) => updateNoteInDir(toNotesDir, note)));

    res.json({ success: true, data: { migrated: sourceNotes.length, total: mergedNotes.length } });
  } catch (error: any) {
    logger.error(`Notes Migrate Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/notes/assets', async (req, res) => {
  const fileName = req.body.fileName || '';
  const data = req.body.data || '';

  if (!fileName || !data) {
    return res.status(400).json({ success: false, error: 'fileName and data are required' });
  }

  try {
    const notesDir = await getNotesDir(req);
    const asset = await saveNoteAsset(notesDir, fileName, data);
    res.json({ success: true, data: asset });
  } catch (error: any) {
    logger.error(`Notes Asset Save Error: ${error.message}`, { module: 'Notes' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/system/mint/launch', (req, res) => {
  try {
    const { program } = req.body;
    const allowedPrograms: Record<string, string> = {
      'cinnamon-settings': 'cinnamon-settings',
      'nemo': 'nemo',
      'gnome-terminal': 'gnome-terminal',
      'mintupdate': 'mintupdate',
      'driver-manager': 'driver-manager',
      'mintinstall': 'mintinstall'
    };

    if (!program || !allowedPrograms[program]) {
      return res.status(400).json({ success: false, error: 'Invalid or missing program identifier' });
    }

    const command = allowedPrograms[program];
    
    logger.info(`Lançando programa nativo do Mint: ${command}`, { module: 'MintIntegration' });
    
    const { spawn } = require('child_process');
    const child = spawn(command, [], {
      detached: true,
      stdio: 'ignore'
    });
    
    child.unref();

    res.json({ success: true, message: `Programa ${command} iniciado.` });
  } catch (error: any) {
    logger.error(`Mint Launch Error: ${error.message}`, { module: 'MintIntegration' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Downloads API ---
router.use('/downloads', downloadRoutes);

// --- Netdisk API ---
router.use('/netdisk', netdiskRoutes);

// --- Music API ---
router.use('/music', musicRoutes);

// --- Local Music API ---
router.use('/localmusic', localmusicRoutes);

// --- Video API ---
router.use('/video', videoRoutes);

// --- Cron API ---
router.use('/cron', cronRoutes);

// --- Reader API ---
router.use('/reader', readerRoutes);

// --- Config API ---
router.use('/config', configRoutes);

// --- Speedtest API ---
router.use('/speedtest', speedtestRoutes);

// --- Stock Analysis API ---
router.use('/stock-analysis', stockAnalysisRoutes);

// --- Dida API ---
router.use('/dida', didaRoutes);

// --- Notifications API ---
router.use('/notifications', notificationsRoutes);
router.use('/opencode', opencodeRoutes);
router.use('/ai', aiRoutes);
router.use('/paperclip', paperclipRoutes);
router.use('/openclaw', openclawRoutes);
router.use('/hermes', hermesRoutes);
router.use('/firecrawl', firecrawlRoutes);
router.use('/antigravity', antigravityRoutes);
router.use('/execution', executionRoutes);

export default router;
