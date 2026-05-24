import os
import sys
import glob
import time
import importlib.util
import sqlite3
import uuid
import json
from datetime import datetime

DB_PATH = "/home/tokio/TokiOS/data/database/tokyo.db"

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS health_check_runs (
            id TEXT PRIMARY KEY,
            started_at TEXT,
            finished_at TEXT,
            duration_ms INTEGER,
            overall_score REAL,
            overall_status TEXT,
            ok_count INTEGER,
            warning_count INTEGER,
            error_count INTEGER,
            critical_count INTEGER,
            not_configured_count INTEGER,
            report_json_path TEXT,
            report_pdf_path TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS health_check_results (
            id TEXT PRIMARY KEY,
            run_id TEXT,
            module_name TEXT,
            test_name TEXT,
            status TEXT,
            severity TEXT,
            message TEXT,
            details TEXT,
            fix_suggestion TEXT,
            duration_ms INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def load_and_run_checks(is_quick_mode=False):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    check_files = glob.glob(os.path.join(base_dir, "checks_*.py"))
    
    all_results = []
    
    for file_path in check_files:
        module_name = os.path.basename(file_path)[:-3]
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        module = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(module)
            if hasattr(module, 'run_checks'):
                res = module.run_checks(is_quick_mode)
                if isinstance(res, list):
                    all_results.extend(res)
        except Exception as e:
            all_results.append({
                "module_name": module_name.replace("checks_", "").capitalize(),
                "test_name": "Runner Initialization",
                "status": "Erro",
                "severity": "high",
                "message": f"Falha ao rodar módulo: {str(e)}",
                "details": "",
                "fix_suggestion": "Verificar sintaxe do script de teste",
                "duration_ms": 0
            })
            
    return all_results

def calculate_score(results):
    ok = 0
    warn = 0
    err = 0
    crit = 0
    not_conf = 0
    
    for r in results:
        status = r.get("status", "").upper()
        if status == "OK":
            ok += 1
        elif status == "ATENÇÃO":
            warn += 1
        elif status == "ERRO":
            err += 1
        elif status == "CRÍTICO":
            crit += 1
        else:
            not_conf += 1
            
    total = max(1, len(results) - not_conf)
    score = ((ok * 1.0) + (warn * 0.5)) / total * 100
    
    if crit > 0:
        overall_status = "Crítico"
    elif err > 0:
        overall_status = "Erro"
    elif warn > 0:
        overall_status = "Atenção"
    else:
        overall_status = "Saudável"
        
    return {
        "score": score,
        "status": overall_status,
        "counts": {"ok": ok, "warn": warn, "err": err, "crit": crit, "not_conf": not_conf}
    }

def run_health_check(is_quick_mode=False):
    init_db()
    
    run_id = str(uuid.uuid4())
    start_time = time.time()
    started_at = datetime.now().isoformat()
    
    results = load_and_run_checks(is_quick_mode)
    
    duration = int((time.time() - start_time) * 1000)
    finished_at = datetime.now().isoformat()
    
    score_data = calculate_score(results)
    
    # Save to JSON
    json_path = f"/home/tokio/TokiOS/outputs/relatorios/autoteste_{run_id}.json"
    with open(json_path, 'w') as f:
        json.dump({"run_id": run_id, "score": score_data, "results": results}, f, indent=2)
        
    # Salvar no DB
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO health_check_runs 
        (id, started_at, finished_at, duration_ms, overall_score, overall_status, ok_count, warning_count, error_count, critical_count, not_configured_count, report_json_path, report_pdf_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (run_id, started_at, finished_at, duration, score_data["score"], score_data["status"], 
          score_data["counts"]["ok"], score_data["counts"]["warn"], score_data["counts"]["err"], 
          score_data["counts"]["crit"], score_data["counts"]["not_conf"], json_path, ""))
          
    for r in results:
        c.execute('''
            INSERT INTO health_check_results 
            (id, run_id, module_name, test_name, status, severity, message, details, fix_suggestion, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), run_id, r.get("module_name"), r.get("test_name"), r.get("status"), 
              r.get("severity"), r.get("message"), r.get("details", ""), r.get("fix_suggestion", ""), r.get("duration_ms", 0)))
              
    conn.commit()
    conn.close()
    
    print(f"Health check finalizado. Score: {score_data['score']:.1f}% | Status: {score_data['status']}")
    return run_id

if __name__ == "__main__":
    import sys
    mode = "--quick" in sys.argv
    run_health_check(mode)
