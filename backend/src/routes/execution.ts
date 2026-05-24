import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  createExecutionFlow, 
  addExecutionStep, 
  updateExecutionStep, 
  finishExecutionFlow, 
  getCurrentExecutionFlow, 
  getExecutionFlowDetails, 
  listExecutionFlows,
  clearExecutionHistory
} from '../utils/executionLogger';

const router = Router();

router.get('/current', async (req, res) => {
  try {
    const flow = await getCurrentExecutionFlow();
    if (!flow) {
      return res.json({ success: true, data: null });
    }
    const steps = await getExecutionFlowDetails(flow.id);
    res.json({ success: true, data: { flow, steps } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const flows = await listExecutionFlows();
    res.json({ success: true, data: flows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/flow/:id', async (req, res) => {
  try {
    const steps = await getExecutionFlowDetails(req.params.id);
    res.json({ success: true, data: steps });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/clear', async (req, res) => {
  try {
    await clearExecutionHistory();
    res.json({ success: true, message: 'Histórico apagado com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/mock', async (req, res) => {
  try {
    const flowId = uuidv4();
    await createExecutionFlow(flowId, 'Crie uma planilha de vendas de fevereiro de 2025', 'Painel', 'Admin');
    
    // Simulate steps based on user request
    await addExecutionStep(uuidv4(), flowId, 1, 'Receber comando', 'Diretor Geral Tokyo', 'Tokyo OS', 'Gemma 3 4B', 'comando recebido e salvo no log', 'concluído', 'local', '');
    
    await addExecutionStep(uuidv4(), flowId, 2, 'Interpretar intenção', 'Diretor Geral Tokyo', 'Roteador de Modelos', 'Qwen3 14B', 'tarefa classificada como análise financeira', 'concluído', 'local', '');

    await addExecutionStep(uuidv4(), flowId, 3, 'Buscar memória', 'Diretor Geral Tokyo', 'Hermes Agent', 'Qwen3 14B', 'encontrado padrão analise_vendas_mensal', 'concluído', 'local', '');

    await addExecutionStep(uuidv4(), flowId, 4, 'Buscar dados', 'CFO Tokyo', 'SQLite / Browser Use', 'Qwen3 14B', 'procurando dados de fevereiro de 2025', 'em execução', 'local', '');

    await addExecutionStep(uuidv4(), flowId, 5, 'Processar dados', 'CFO Tokyo', 'Python', 'DeepSeek R1', 'calcular vendas, meta, gap', 'pendente', 'local', 'tarefa com cálculo e raciocínio');

    await addExecutionStep(uuidv4(), flowId, 6, 'Criar planilha', 'Documentos Tokyo', 'OpenPyXL / LibreOffice', 'Qwen3 14B', 'gerar XLSX', 'pendente', 'local', '');

    await addExecutionStep(uuidv4(), flowId, 7, 'Gerar PDF', 'Documentos Tokyo', 'LibreOffice', 'Qwen3 14B', 'gerar PDF executivo', 'pendente', 'local', '');

    await addExecutionStep(uuidv4(), flowId, 8, 'Entregar resposta', 'Diretor Geral Tokyo', 'Tokyo IA', 'Qwen3 14B', 'responder ao usuário', 'pendente', 'local', '');

    res.json({ success: true, message: 'Fluxo mockado gerado com sucesso.', flowId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
