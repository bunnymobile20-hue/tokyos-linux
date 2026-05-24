import os
import psutil
import yaml
import json

def check_folder(path):
    return os.path.isdir(path)

def check_file(path):
    return os.path.isfile(path)

def run_diagnostics():
    print("=== AutoTeste Tokyo OS ===")
    
    # 1. Pastas Recomendadas
    pastas = ["app", "agents", "tools", "dashboard", "data", "memory", "outputs", "logs", "config"]
    base_dir = "/home/tokio/TokiOS"
    
    pastas_ok = 0
    for p in pastas:
        if check_folder(os.path.join(base_dir, p)):
            pastas_ok += 1
            print(f" [OK] Pasta {p}")
        else:
            print(f" [ERRO] Pasta {p} ausente!")
            
    # 2. Configurações Yaml
    configs = ["models.yaml", "agents.yaml", "tools.yaml", "permissions.yaml"]
    configs_ok = 0
    for c in configs:
        if check_file(os.path.join(base_dir, "config", c)):
            configs_ok += 1
            print(f" [OK] Config {c}")
        else:
            print(f" [ERRO] Config {c} ausente!")
            
    # 3. Recursos (RAM, CPU)
    print("\n=== Recursos ===")
    ram = psutil.virtual_memory()
    print(f" RAM: {ram.percent}% em uso")
    cpu = psutil.cpu_percent(interval=1)
    print(f" CPU: {cpu}% em uso")
    
    # Resumo
    print("\n=== Resultado ===")
    total_itens = len(pastas) + len(configs)
    sucessos = pastas_ok + configs_ok
    saude = int((sucessos / total_itens) * 100)
    print(f" Saúde geral: {saude}%")
    if saude == 100:
        print(" Status: OK")
    else:
        print(" Status: Atenção (Verifique os erros)")

if __name__ == "__main__":
    run_diagnostics()
