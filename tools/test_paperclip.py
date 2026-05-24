import yaml
import sys
import json

def load_agents_config():
    config_path = "/home/tokio/TokiOS/config/agents.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def route_command(command, config):
    print(f"[{config['orquestrador']['nome']}] Recebendo comando: '{command}'")
    
    # Simulação básica de roteamento baseada em palavras-chave
    comando_lower = command.lower()
    
    agente_escolhido = None
    if "vendas" in comando_lower or "dre" in comando_lower or "lucro" in comando_lower:
        agente_escolhido = "cfo_tokyo"
    elif "arte" in comando_lower or "banner" in comando_lower:
        agente_escolhido = "designer_tokyo"
    elif "planilha" in comando_lower or "relatório" in comando_lower:
        agente_escolhido = "documentos_tokyo"
    elif "contratar" in comando_lower or "equipe" in comando_lower:
        agente_escolhido = "rh_tokyo"
    else:
        agente_escolhido = "diretor_geral_tokyo"

    # Encontrar os detalhes do agente
    agente_info = next((f for f in config['funcionarios'] if f['id'] == agente_escolhido), None)
    
    if agente_info:
        print(f"[{config['orquestrador']['nome']}] Roteando para funcionário ideal: {agente_info['nome']} ({agente_info['funcao']})")
        return agente_info
    else:
        print(f"[ERRO] Agente {agente_escolhido} não encontrado nas configurações.")
        return None

if __name__ == "__main__":
    config = load_agents_config()
    
    testes = [
        "Tokyo, crie uma planilha de vendas de fevereiro de 2025.",
        "Preciso de um banner para o novo produto",
        "Qual foi nosso lucro líquido e DRE ontem?"
    ]
    
    print("\n--- INICIANDO TESTE DO PAPERCLIP (Roteamento) ---")
    for t in testes:
        print("\n---------------------------------------------------")
        route_command(t, config)
    print("---------------------------------------------------\n")
