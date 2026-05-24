import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger';

export interface VirtualEmployee {
  id: string;
  name: string;
  role: string;
  permissions: string;
  goals: string;
  engine: string;
  budget_limit: number;
  budget_used: number;
}

export interface PaperclipTask {
  id: string;
  agent_id: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  delivery_log: string;
  created_at: number;
}

class PaperclipManager {
  private db: Database | null = null;
  private readonly dbPath: string;

  constructor() {
    this.dbPath = path.join(os.homedir(), '.clawos', 'paperclip.db');
  }

  async init() {
    // Garantir o diretório
    const dir = path.dirname(this.dbPath);
    await require('fs/promises').mkdir(dir, { recursive: true }).catch(() => {});

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        permissions TEXT,
        goals TEXT,
        engine TEXT,
        budget_limit REAL,
        budget_used REAL
      );
      
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        agent_id TEXT,
        description TEXT,
        status TEXT,
        delivery_log TEXT,
        created_at INTEGER
      );
    `);

    await this.seedInitialAgents();
  }

  private async seedInitialAgents() {
    const row = await this.db!.get('SELECT COUNT(*) as count FROM agents');
    if (row.count === 0) {
      logger.info('Seeding initial Bunny Dreams virtual employees...', { module: 'Paperclip' });
      const initialAgents = [
        { id: 'ceo', name: 'CEO Tokyo', role: 'Visão Estratégica', permissions: 'ALL', goals: 'Crescimento e Cultura', engine: 'DeepSeek R1' },
        { id: 'cfo', name: 'CFO Tokyo', role: 'Gestão Financeira', permissions: 'FINANCE', goals: 'Controle de Custos e ROI', engine: 'DeepSeek R1' },
        { id: 'coo', name: 'COO Tokyo', role: 'Operações e Processos', permissions: 'OPS', goals: 'Eficiência Operacional', engine: 'DeepSeek R1' },
        { id: 'cont', name: 'Contadora Tokyo', role: 'Impostos e Auditoria', permissions: 'FINANCE', goals: 'Compliance Contábil', engine: 'Qwen3 14B' },
        { id: 'adv', name: 'Advogada Tokyo', role: 'Jurídico e Contratos', permissions: 'LEGAL', goals: 'Segurança Jurídica', engine: 'Qwen3 14B' },
        { id: 'rh', name: 'RH Tokyo', role: 'Recursos Humanos', permissions: 'HR', goals: 'Satisfação da Equipe', engine: 'Qwen3 14B' },
        { id: 'vm', name: 'VM Tokyo', role: 'Visual Merchandising', permissions: 'STORE', goals: 'Atratividade das Lojas', engine: 'Gemini' },
        { id: 'arq', name: 'Arquiteta Tokyo', role: 'Projetos e Layout', permissions: 'STORE', goals: 'Expansão Física', engine: 'Gemini' },
        { id: 'sm', name: 'Social Media Tokyo', role: 'Redes Sociais', permissions: 'SOCIAL', goals: 'Engajamento', engine: 'Gemini' },
        { id: 'vmaker', name: 'Video Maker Tokyo', role: 'Produção Audiovisual', permissions: 'CREATIVE', goals: 'Conversão em Vídeo', engine: 'Gemini' },
        { id: 'des', name: 'Design Tokyo', role: 'Identidade Visual', permissions: 'CREATIVE', goals: 'Estética Premium', engine: 'Gemini' },
        { id: 'dev', name: 'Programadora Tokyo', role: 'Software e Automação', permissions: 'IT', goals: 'Sistemas Estáveis e Rápidos', engine: 'DeepSeek R1' },
        { id: 'ven', name: 'Vendas Tokyo', role: 'Estratégia Comercial', permissions: 'SALES', goals: 'Bater Metas Mensais', engine: 'Qwen3 14B' },
        { id: 'dados', name: 'Analista de Dados Tokyo', role: 'BI e Previsões', permissions: 'DATA', goals: 'Decisões Baseadas em Dados', engine: 'DeepSeek R1' },
        { id: 'ass', name: 'Assistente Tokyo', role: 'Apoio Administrativo', permissions: 'ADMIN', goals: 'Organização do Fluxo', engine: 'Qwen3 14B' },
        { id: 'est', name: 'Estoquista Tokyo', role: 'Gestão de Inventário', permissions: 'INVENTORY', goals: 'Otimização de Curva ABC', engine: 'Qwen3 14B' }
      ];

      const stmt = await this.db!.prepare('INSERT INTO agents (id, name, role, permissions, goals, engine, budget_limit, budget_used) VALUES (?, ?, ?, ?, ?, ?, 100, 0)');
      for (const agent of initialAgents) {
        await stmt.run(agent.id, agent.name, agent.role, agent.permissions, agent.goals, agent.engine);
      }
      await stmt.finalize();
    }
  }

  async getAgents(): Promise<VirtualEmployee[]> {
    if (!this.db) await this.init();
    return this.db!.all('SELECT * FROM agents');
  }

  async updateAgent(agent: VirtualEmployee) {
    if (!this.db) await this.init();
    await this.db!.run(`
      UPDATE agents SET name=?, role=?, permissions=?, goals=?, engine=?, budget_limit=?, budget_used=? WHERE id=?
    `, agent.name, agent.role, agent.permissions, agent.goals, agent.engine, agent.budget_limit, agent.budget_used, agent.id);
  }

  async getTasks(): Promise<PaperclipTask[]> {
    if (!this.db) await this.init();
    return this.db!.all('SELECT * FROM tasks ORDER BY created_at DESC');
  }

  async createTask(task: PaperclipTask) {
    if (!this.db) await this.init();
    await this.db!.run(`
      INSERT INTO tasks (id, agent_id, description, status, delivery_log, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, task.id, task.agent_id, task.description, task.status, task.delivery_log, task.created_at);
  }

  async updateTaskStatus(id: string, status: string, log: string) {
    if (!this.db) await this.init();
    await this.db!.run(`
      UPDATE tasks SET status=?, delivery_log=? WHERE id=?
    `, status, log, id);
  }
}

export const paperclipManager = new PaperclipManager();
