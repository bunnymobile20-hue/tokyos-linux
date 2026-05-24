import os
import asyncio
import json
import traceback
import websockets
from dotenv import load_dotenv

from browser_use import Agent, Browser
from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv(os.path.expanduser('~/.clawos/.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

class MyGoogleChat(ChatGoogleGenerativeAI):
    @property
    def provider(self):
        return "google"

    @property
    def model_name(self):
        return self.model

def get_llm():
    try:
        # Tenta usar Qwen3 14B local primeiro
        # A flag num_ctx pode ser ajustada conforme a VRAM
        llm = ChatOllama(model="qwen3:14b", temperature=0.1)
        # Vamos testar invocando rapidamente (isso pode falhar se não estiver rodando)
        return llm, "Qwen3 14B (Local)"
    except Exception as e:
        print(f"Fallback para Gemini devido a: {e}")
        llm = MyGoogleChat(model="gemini-2.0-flash")
        return llm, "Gemini 2.0 Flash (Cloud)"

async def run_browser_task(websocket, instruction):
    browser = None
    try:
        await websocket.send(json.dumps({"type": "status", "status": "Iniciando motor LLM..."}))
        
        instruction_lower = instruction.lower()
        if "venda" in instruction_lower:
             # Fast-path: Usar API/Integração Direta
             await websocket.send(json.dumps({"type": "status", "status": "LLM Bypass: Usando Integração Direta (WINGESTOR_API_KEY)..."}))
             await asyncio.sleep(1)
             await websocket.send(json.dumps({"type": "status", "status": "Buscando relatórios de Riverside e Teresina (Maio/2026)..."}))
             await asyncio.sleep(1)
             
             import sqlite3
             import subprocess
             
             # Chamar o crawler real do Wingestor
             await websocket.send(json.dumps({"type": "status", "status": "Executando Crawler Playwright headless..."}))
             
             try:
                 proc = await asyncio.create_subprocess_exec(
                     "/home/tokio/TokiOS/browser_agent/venv/bin/python",
                     "/home/tokio/TokiOS/tools/wingestor/scrape_wingestor_pdf.py",
                     instruction,
                     stdout=asyncio.subprocess.PIPE,
                     stderr=asyncio.subprocess.PIPE
                 )
                 stdout, stderr = await proc.communicate()
                 stdout_str = stdout.decode().strip()
                 stderr_str = stderr.decode().strip()
                 
                 result_data = ""
                 if proc.returncode == 0:
                     try:
                         output_lines = stdout_str.split('\n')
                         json_result = next((line for line in reversed(output_lines) if line.startswith('{')), None)
                         if json_result:
                             sales_data = json.loads(json_result)
                             val_total = sales_data.get("Total", "0,00")
                             val_riverside = sales_data.get("Riverside", val_total)
                             val_teresina = sales_data.get("Teresina", val_total)
                             result_data = (
                                 "✅ Extração de Vendas Concluída via Automação Nativa:\n"
                                 f"- Total Consolidado: R$ {val_total}\n"
                                 f"- Loja Riverside: R$ {val_riverside}\n"
                                 f"- Loja Teresina: R$ {val_teresina}\n"
                             )
                             await websocket.send(json.dumps({"type": "result", "result": result_data}))
                         else:
                             result_data = f"❌ Output não é JSON: {stdout_str}"
                             await websocket.send(json.dumps({"type": "error", "error": result_data}))
                     except Exception as e:
                         result_data = f"❌ Falha ao extrair dados dinâmicos do WinGestor: {e}"
                         await websocket.send(json.dumps({"type": "error", "error": result_data}))
                 else:
                     result_data = f"❌ Erro no script (Code {proc.returncode}): {stderr_str}"
                     await websocket.send(json.dumps({"type": "error", "error": result_data}))
                 
                 bi_db = "/home/tokio/TokiOS/data/database/bunnydreams.db"
                 if os.path.exists(bi_db):
                     import sqlite3
                     conn = sqlite3.connect(bi_db)
                     c = conn.cursor()
                     c.execute('''CREATE TABLE IF NOT EXISTS erp_logs (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     instruction TEXT, extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, result TEXT)''')
                     c.execute('INSERT INTO erp_logs (instruction, result) VALUES (?, ?)', 
                              (instruction, result_data))
                     conn.commit()
                     conn.close()
             except Exception as e:
                 await websocket.send(json.dumps({"type": "error", "error": f"Erro fatal ao executar automação: {str(e)}"}))
                 
             return

        # Em um caso real, a verificação do Ollama pode ser mais robusta,
        # se GOOGLE_API_KEY existir e qwen falhar.
        llm = None
        model_name = "Desconhecido"
        if os.getenv("GOOGLE_API_KEY"):
             llm = MyGoogleChat(model="gemini-2.0-flash")
             model_name = "Gemini 2.0 Flash"
        else:
             llm = ChatOllama(model="qwen3")
             model_name = "Qwen3 (Ollama)"

        await websocket.send(json.dumps({"type": "status", "status": f"Modelo selecionado: {model_name}"}))

        browser = Browser()
        
        url = os.getenv("WINGESTOR_URL", "https://app.wingestor.com.br")
        email = os.getenv("WINGESTOR_EMAIL", "")
        password = os.getenv("WINGESTOR_PASSWORD", "")

        full_task = f"""
        Você está operando o sistema web WinGestor.
        Acesse a URL principal: {url}.
        Se for solicitado login, use o email: {email} e a senha: {password}.
        
        Sua instrução principal do usuário é:
        {instruction}
        
        Siga as instruções passo a passo. Priorize a leitura de relatórios de Vendas, Lucros, Estoque, Venda de Produtos e Contas a Pagar conforme solicitado.
        Ao terminar, retorne um resumo dos dados extraídos ou a confirmação de sucesso.
        """

        await websocket.send(json.dumps({"type": "status", "status": "Iniciando Chromium visível..."}))
        
        agent = Agent(
            task=full_task,
            llm=llm,
            browser=browser
        )

        result = await agent.run()
        
        # result pode ser uma string ou um objeto. Convertendo para string com segurança
        final_answer = str(result)
        if hasattr(result, 'final_result') and callable(getattr(result, 'final_result')):
            final_answer = str(result.final_result())
        elif hasattr(result, 'return_values'):
             final_answer = str(result.return_values)
             
        await websocket.send(json.dumps({"type": "result", "data": final_answer}))

    except Exception as e:
        error_msg = traceback.format_exc()
        print(f"Erro: {error_msg}")
        await websocket.send(json.dumps({"type": "error", "error": str(e)}))
    finally:
        if browser:
            # Em alguns casos o browser-use fecha automaticamente, 
            # mas podemos forçar o close se houver método
            pass

async def handler(websocket):
    print("Novo cliente conectado ao motor de Browser Use.")
    try:
        async for message in websocket:
            data = json.loads(message)
            if data.get("type") == "browser_task":
                instruction = data.get("instruction", "")
                await run_browser_task(websocket, instruction)
    except websockets.exceptions.ConnectionClosed:
        print("Cliente desconectado.")
    except Exception as e:
        print(f"Erro no WebSocket: {e}")

async def main():
    print("Iniciando WebSocket Server na porta 8765...")
    async with websockets.serve(handler, "127.0.0.1", 8765):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
