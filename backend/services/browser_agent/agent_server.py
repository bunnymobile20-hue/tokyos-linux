import asyncio
import json
import logging
from browser_use import Agent, Browser
from langchain_ollama import ChatOllama
import websockets

logging.basicConfig(level=logging.INFO)

# Use ChatOllama with 32000 context window! Default 2048 truncates the DOM.
llm = ChatOllama(
    model="qwen2.5-coder:32b",
    temperature=0.0,
    num_ctx=32000
)

# Force properties to exist for browser-use if needed
ChatOllama.provider = property(lambda self: "ollama")
ChatOllama.model_name = property(lambda self: self.model)

# Configure browser-use to be visible (headless=False)
browser = Browser(headless=False)

async def run_agent(task_instruction: str):
    agent = Agent(
        task=task_instruction,
        llm=llm,
        browser=browser,
        use_vision=False
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
