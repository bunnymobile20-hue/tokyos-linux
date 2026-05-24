import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { logger } from '../utils/logger';
import { createExecutionFlow, finishExecutionFlow } from '../utils/executionLogger';
import { v4 as uuidv4 } from 'uuid';

// Create a WebSocket Server without attaching it directly to an HTTP server yet
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  logger.info(`Voice Assistant connected from ${req.socket.remoteAddress}`);

  ws.on('message', (message: Buffer | string) => {
    // Here we will process audio chunks coming from the frontend
    // For now, we just acknowledge or echo back for testing
    // In a full implementation, we'd pipe this to a VLM or local Whisper
    if (typeof message === 'string') {
      logger.info(`Received voice command text: ${message}`);
      
      const flowId = uuidv4();
      createExecutionFlow(flowId, `Voz: ${message}`, "VoiceWidget", "Tokio");
      
      // Simulate sending back an audio/text response
      ws.send(JSON.stringify({ type: 'text', text: `Compreendido. Comando [${message}] adicionado à fila.` }));
      
      setTimeout(() => {
        finishExecutionFlow(flowId, "Finalizado", `Não foi possível processar a intenção: Pipeline de IA de voz em construção. Wingestor não foi acessado.`);
      }, 2000);
    } else {
      // Audio chunk (binary)
      logger.debug(`Received audio chunk of size ${message.length}`);
      // TODO: Pipe to livekit/whisper/openai
    }
  });

  ws.on('close', () => {
    logger.info('Voice Assistant disconnected');
  });
});

/**
 * Handle HTTP Upgrade request for the Voice WebSocket
 */
export function handleVoiceUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
}
