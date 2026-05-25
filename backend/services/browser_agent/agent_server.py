import asyncio
import json
import logging
from browser_use import Agent, Browser
from browser_use.llm.ollama.chat import ChatOllama as OllamaBU
import websockets

logging.basicConfig(level=logging.INFO)

llm = OllamaBU(
    model="qwen3:14b",
    host="http://127.0.0.1:11434",
    ollama_options={"num_ctx": 40000, "temperature": 0.0}
)

browser = Browser(headless=False)

async def run_agent(task_instruction: str):
    agent = Agent(
        task=task_instruction,
        llm=llm,
        browser=browser,
        use_vision=False,
        max_failures=3,
        max_steps=15,
        llm_timeout=180,
        max_clickable_elements_length=5000
    )
    result = await agent.run()
    return result

async def handler(websocket):
    logging.info("WebSocket client connected")
    try:
        async for message in websocket:
            logging.info(f"Received message: {message}")
            try:
                data = json.loads(message)
                if data.get('type') == 'browser_task':
                    instruction = data.get('instruction', '')
                    await websocket.send(json.dumps({
                        "type": "status",
                        "status": f"Executando tarefa: {instruction}"
                    }))
                    
                    # Run the agent
                    result = await run_agent(instruction)
                    
                    # Send result back
                    final_msg = result.final_result()
                    
                    if not final_msg:
                        if result.has_errors():
                            errors = result.errors()
                            final_msg = f"A navegação falhou ou foi interrompida. Erros: {errors[-1] if errors else 'Desconhecido'}"
                        else:
                            final_msg = "Tarefa concluída (sem mensagem final)."
                        
                    await websocket.send(json.dumps({
                        "type": "result",
                        "data": final_msg
                    }))
            except Exception as e:
                logging.error(f"Error processing message: {e}")
                await websocket.send(json.dumps({
                    "type": "error",
                    "error": str(e)
                }))
    except websockets.exceptions.ConnectionClosed:
        logging.info("WebSocket client disconnected")

async def main():
    # Start WebSocket server on port 8765
    server = await websockets.serve(handler, "127.0.0.1", 8765)
    logging.info("Browser Agent Server started on ws://127.0.0.1:8765")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
