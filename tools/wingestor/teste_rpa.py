import asyncio
import websockets
import json

async def test_rpa():
    uri = "ws://127.0.0.1:8765"
    print(f"Conectando ao Motor RPA em {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Conectado com sucesso.")
            
            instruction = "Extrair dados de vendas do mês de maio de cada loja"
            payload = json.dumps({"type": "browser_task", "instruction": instruction})
            
            print(f"Enviando instrução: '{instruction}'")
            await websocket.send(payload)
            
            while True:
                response = await websocket.recv()
                data = json.loads(response)
                
                if data["type"] == "status":
                    print(f"⏳ [Status Agent]: {data['status']}")
                elif data["type"] == "result":
                    print(f"\n🚀 [SUCESSO - Dados Retornados]:\n{data['data']}")
                    break
                elif data["type"] == "error":
                    print(f"\n❌ [ERRO]: {data['error']}")
                    break
                    
    except ConnectionRefusedError:
        print("❌ Falha na conexão. O Motor RPA (ws_server.py) está rodando?")

if __name__ == "__main__":
    asyncio.run(test_rpa())
