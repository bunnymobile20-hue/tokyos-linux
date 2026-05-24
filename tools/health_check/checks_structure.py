import os
import time

def run_checks(is_quick_mode=False):
    results = []
    base_dir = "/home/tokio/TokiOS"
    folders_to_check = [
        "app", "agents", "tools", "dashboard", "data", "data/raw", "data/processed",
        "data/database", "memory", "outputs", "outputs/planilhas", "outputs/pdfs",
        "outputs/imagens", "outputs/videos", "outputs/relatorios", "logs", "backups", "config"
    ]
    
    start_time = time.time()
    missing_folders = []
    
    for folder in folders_to_check:
        if not os.path.isdir(os.path.join(base_dir, folder)):
            missing_folders.append(folder)
            
    duration = int((time.time() - start_time) * 1000)
    
    if missing_folders:
        results.append({
            "module_name": "Structure",
            "test_name": "Pastas Obrigatórias",
            "status": "Erro",
            "severity": "high",
            "message": f"Faltam {len(missing_folders)} pastas essenciais.",
            "details": ", ".join(missing_folders),
            "fix_suggestion": "Criar pastas ausentes usando `mkdir -p`",
            "duration_ms": duration
        })
    else:
        results.append({
            "module_name": "Structure",
            "test_name": "Pastas Obrigatórias",
            "status": "OK",
            "severity": "low",
            "message": "Todas as pastas existem.",
            "details": "",
            "fix_suggestion": "",
            "duration_ms": duration
        })
        
    return results
