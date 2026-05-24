import { Queue, Worker, Job } from 'bullmq';
import { logger } from './logger';
import { saveToMemoryVault } from './memoryManager';

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const socialMediaQueue = new Queue('SocialMedia', { connection });
export const agentTasksQueue = new Queue('AgentTasks', { connection });

// Example worker for SocialMedia
const socialMediaWorker = new Worker('SocialMedia', async (job: Job) => {
  logger.info(`Processing SocialMedia job ${job.id}: ${job.name}`);
  // Simulando automação (Playwright ou API)
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  saveToMemoryVault({
    title: `Postagem de Rede Social: ${job.name}`,
    category: 'bunny_dreams',
    content: `Conteúdo processado: ${JSON.stringify(job.data)}`,
    tags: ['bullmq', 'social_media', 'automation']
  });

  return { success: true, posted: true };
}, { connection });

// Example worker for AgentTasks
const agentTasksWorker = new Worker('AgentTasks', async (job: Job) => {
  logger.info(`Processing AgentTasks job ${job.id}: ${job.name}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  saveToMemoryVault({
    title: `Tarefa de Agente Concluída: ${job.name}`,
    category: 'processos',
    content: `Tarefa executada com sucesso. Dados: ${JSON.stringify(job.data)}`,
    tags: ['bullmq', 'agent_task', 'automation']
  });

  return { success: true, processed: true };
}, { connection });

socialMediaWorker.on('completed', job => {
  logger.info(`SocialMedia job ${job.id} has completed!`);
});

socialMediaWorker.on('failed', (job, err) => {
  logger.error(`SocialMedia job ${job?.id} has failed with ${err.message}`);
});

agentTasksWorker.on('completed', job => {
  logger.info(`AgentTasks job ${job.id} has completed!`);
});

agentTasksWorker.on('failed', (job, err) => {
  logger.error(`AgentTasks job ${job?.id} has failed with ${err.message}`);
});
