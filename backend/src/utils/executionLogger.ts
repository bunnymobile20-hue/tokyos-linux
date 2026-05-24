import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

const homeDir = process.env.HOME || require('os').homedir();
const clawosDir = path.join(homeDir, '.clawos');
if (!fs.existsSync(clawosDir)) fs.mkdirSync(clawosDir, { recursive: true });

// Arquivo separado para no onerar tokyo.db
const dbPath = path.join(clawosDir, 'tokyo_executions.db');
const db = new sqlite3.Database(dbPath);

export function initExecutionDB() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS execution_flows (
        id TEXT PRIMARY KEY,
        command_text TEXT,
        command_source TEXT,
        user_name TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        total_duration_ms INTEGER,
        status TEXT,
        main_agent TEXT,
        final_response TEXT,
        created_files_json TEXT,
        error_summary TEXT,
        requires_approval BOOLEAN DEFAULT 0,
        approval_status TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS execution_steps (
        id TEXT PRIMARY KEY,
        flow_id TEXT,
        step_order INTEGER,
        step_name TEXT,
        step_type TEXT,
        status TEXT,
        agent_name TEXT,
        tool_name TEXT,
        model_name TEXT,
        model_provider TEXT,
        model_type TEXT,
        reason_for_model_choice TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        duration_ms INTEGER,
        input_summary TEXT,
        output_summary TEXT,
        error_message TEXT,
        requires_approval BOOLEAN DEFAULT 0,
        approval_status TEXT,
        metadata_json TEXT,
        FOREIGN KEY (flow_id) REFERENCES execution_flows(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tool_usage_logs (
        id TEXT PRIMARY KEY,
        flow_id TEXT,
        step_id TEXT,
        tool_name TEXT,
        action_name TEXT,
        purpose TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        duration_ms INTEGER,
        status TEXT,
        cost_estimate REAL,
        is_cloud BOOLEAN,
        metadata_json TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS model_usage_logs (
        id TEXT PRIMARY KEY,
        flow_id TEXT,
        step_id TEXT,
        model_name TEXT,
        provider TEXT,
        model_type TEXT,
        purpose TEXT,
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        estimated_cost REAL,
        latency_ms INTEGER,
        status TEXT,
        metadata_json TEXT
      )
    `);
    
    logger.info('Execution DB tables verified.', { module: 'ExecutionFlow' });
  });
}

initExecutionDB();

// 1. Criar novo fluxo
export const createExecutionFlow = (
  id: string,
  command_text: string,
  command_source: string,
  user_name: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO execution_flows (id, command_text, command_source, user_name, status) VALUES (?, ?, ?, ?, 'em execução')`,
      [id, command_text, command_source, user_name],
      (err) => (err ? reject(err) : resolve())
    );
  });
};

// 2. Registrar etapa
export const addExecutionStep = (
  id: string,
  flow_id: string,
  step_order: number,
  step_name: string,
  agent_name: string,
  tool_name: string,
  model_name: string,
  purpose: string,
  status: string = 'pendente',
  model_type: string = 'local',
  reason_for_model_choice: string = ''
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO execution_steps (id, flow_id, step_order, step_name, agent_name, tool_name, model_name, input_summary, status, model_type, reason_for_model_choice) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, flow_id, step_order, step_name, agent_name, tool_name, model_name, purpose, status, model_type, reason_for_model_choice],
      (err) => (err ? reject(err) : resolve())
    );
  });
};

// 3. Atualizar status da etapa
export const updateExecutionStep = (
  id: string,
  status: string,
  output_summary: string,
  error_message: string = '',
  duration_ms: number = 0
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE execution_steps SET status = ?, output_summary = ?, error_message = ?, finished_at = CURRENT_TIMESTAMP, duration_ms = ? WHERE id = ?`,
      [status, output_summary, error_message, duration_ms, id],
      (err) => (err ? reject(err) : resolve())
    );
  });
};

// 4. Finalizar fluxo
export const finishExecutionFlow = (
  flow_id: string,
  status: string,
  final_response: string,
  created_files_json: string = '[]',
  total_duration_ms: number = 0
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE execution_flows SET status = ?, final_response = ?, created_files_json = ?, finished_at = CURRENT_TIMESTAMP, total_duration_ms = ? WHERE id = ?`,
      [status, final_response, created_files_json, total_duration_ms, flow_id],
      (err) => (err ? reject(err) : resolve())
    );
  });
};

// Ler fluxo atual
export const getCurrentExecutionFlow = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM execution_flows ORDER BY started_at DESC LIMIT 1`,
      [],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
};

// Buscar detalhes
export const getExecutionFlowDetails = (flow_id: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM execution_steps WHERE flow_id = ? ORDER BY step_order ASC`,
      [flow_id],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
};

// Listar histórico
export const listExecutionFlows = (limit: number = 50): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM execution_flows ORDER BY started_at DESC LIMIT ?`,
      [limit],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
};

export const clearExecutionHistory = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`DELETE FROM execution_steps`);
      db.run(`DELETE FROM execution_flows`);
      resolve();
    });
  });
};
