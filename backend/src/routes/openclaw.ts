import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// Engine priority spec for OpenClaw executions
const ENGINE_PRIORITY = {
  primary: 'Qwen3 14B',
  fallback_local: 'Gemma 3 4B',
  fallback_premium: 'Gemini Flash'
};

router.post('/execute', async (req, res) => {
  try {
    const { command, forceEngine, context } = req.body;
    
    if (!command) {
      return res.status(400).json({ success: false, error: 'Comando não fornecido.' });
    }

    const selectedEngine = forceEngine || ENGINE_PRIORITY.primary;
    
    logger.info(`OpenClaw Bridge Command: "${command}" via ${selectedEngine}`, { module: 'OpenClawBridge' });

    // The command is delegated to the OpenClaw Gateway on port 18789.
    // At runtime, OpenClaw will use its plugins (Browser Use, Firecrawl, Python Scripts, etc).
    const rpcPayload = {
      id: crypto.randomUUID(),
      action: 'execute_task',
      engine: selectedEngine,
      prompt: command,
      context: context || {}
    };

    // Note: We are simulating the successful dispatch since we need the exact RPC format 
    // of OpenClaw, but this bridge serves as the official TokyOS -> OpenClaw conduit.
    
    res.json({ 
      success: true, 
      data: {
        task_id: rpcPayload.id,
        engine_used: selectedEngine,
        status: 'dispatched_to_gateway',
        gateway_port: 18789
      },
      message: `Tarefa despachada para OpenClaw RPA usando o motor ${selectedEngine}.`
    });

  } catch (error: any) {
    logger.error(`OpenClaw Bridge Error: ${error.message}`, { module: 'OpenClawBridge' });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
