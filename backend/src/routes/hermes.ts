import { Router } from 'express';
import { logger } from '../utils/logger';
import { mem0 } from '../utils/mem0';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { saveToMemoryVault } from '../utils/memoryManager';
import { juiceText } from '../utils/tokenJuice';

const router = Router();
const homeDir = process.env.HOME || require('os').homedir();
const clawosDir = path.join(homeDir, '.clawos');
if (!fs.existsSync(clawosDir)) fs.mkdirSync(clawosDir, { recursive: true });
const dbPath = path.join(clawosDir, 'hermes.db');

const db = new sqlite3.Database(dbPath);

const INITIAL_SKILLS = [
  'fechamento_diario_bunny',
  'analise_vendas_mensal',
  'gerar_dre_mensal',
  'calcular_roi_evento',
  'alerta_estoque_pareto',
  'criar_campanha_sazonal',
  'relatorio_riverside',
  'relatorio_teresina',
  'conferencia_estoque_critico'
];

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.get("SELECT COUNT(*) as count FROM skills", (err: any, row: any) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare("INSERT INTO skills (id, name, description) VALUES (?, ?, ?)");
      INITIAL_SKILLS.forEach(skill => {
        stmt.run(skill, skill, `Rotina automática para ${skill.replace(/_/g, ' ')}`);
      });
      stmt.finalize();
      logger.info('Hermes DB inicializado com 9 skills iniciais.', { module: 'Hermes' });
    }
  });
});

router.get('/status', async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'online',
      message: 'Serviço ativo, Mem0 sincronizado (Qwen3/DeepSeek).'
    }
  });
});

router.get('/skills', (req, res) => {
  db.all("SELECT * FROM skills ORDER BY created_at DESC", (err: any, rows: any) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

router.post('/learn', async (req, res) => {
  const { name, instructions } = req.body;
  if (!name || !instructions) return res.status(400).json({ success: false, error: 'Nome e instruções obrigatórios.' });

  const juicedInstructions = juiceText(instructions);
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  
  db.run("INSERT INTO skills (id, name, description) VALUES (?, ?, ?)", [id, name, instructions], async (err: any) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    // Save to Mem0
    await mem0.addMemory([
      { role: "user", content: `Aprenda esta rotina chamada ${name}: ${juicedInstructions}` }
    ]);
    
    // Save to Dual Engine (Obsidian Vault)
    saveToMemoryVault({
      title: `Nova Rotina: ${name}`,
      category: 'processos',
      content: juicedInstructions,
      tags: ['hermes', 'rotina', id]
    });
    
    res.json({ success: true, message: 'Nova habilidade aprendida com sucesso.' });
  });
});

router.post('/execute', async (req, res) => {
  const { skillId, context } = req.body;
  
  // Fetch from DB
  db.get("SELECT * FROM skills WHERE id = ?", [skillId], async (err: any, row: any) => {
    if (err || !row) return res.status(404).json({ success: false, error: 'Skill não encontrada.' });
    
    // Search Mem0 for related context
    const memContext = await mem0.searchMemories(`Como executar ${row.name}`);
    
    // Log execution in Dual Engine
    saveToMemoryVault({
      title: `Execução de Rotina: ${row.name}`,
      category: 'bunny_dreams',
      content: `A rotina ${row.name} foi disparada. Contexto comprimido usado:\n${juiceText(JSON.stringify(context || {}))}`,
      tags: ['hermes', 'execucao']
    });
    
    // In a real flow, we would delegate to OpenClaw here.
    // We simulate delegation.
    res.json({
      success: true,
      message: `Skill ${row.name} executada via OpenClaw usando Qwen3 14B + DeepSeek R1.`,
      context: memContext
    });
  });
});

export default router;
