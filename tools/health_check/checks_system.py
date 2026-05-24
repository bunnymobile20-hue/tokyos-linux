import psutil
import time
import os

def run_checks(is_quick_mode=False):
    results = []
    start_time = time.time()
    
    # 1. CPU
    cpu_usage = psutil.cpu_percent(interval=1)
    status = "OK"
    severity = "low"
    if cpu_usage > 90:
        status = "Crítico"
        severity = "critical"
    elif cpu_usage > 75:
        status = "Atenção"
        severity = "medium"
        
    results.append({
        "module_name": "System",
        "test_name": "Uso de CPU",
        "status": status,
        "severity": severity,
        "message": f"Uso de CPU está em {cpu_usage}%",
        "details": "",
        "fix_suggestion": "Verificar processos pesados" if status != "OK" else "",
        "duration_ms": int((time.time() - start_time) * 1000)
    })
    
    # 2. RAM
    ram = psutil.virtual_memory()
    start_time = time.time()
    status = "OK"
    severity = "low"
    if ram.percent > 90:
        status = "Crítico"
        severity = "critical"
    elif ram.percent > 80:
        status = "Atenção"
        severity = "medium"
        
    results.append({
        "module_name": "System",
        "test_name": "Uso de RAM",
        "status": status,
        "severity": severity,
        "message": f"Uso de RAM está em {ram.percent}%",
        "details": f"Usado: {ram.used / (1024**3):.1f}GB / Total: {ram.total / (1024**3):.1f}GB",
        "fix_suggestion": "Fechar aplicações ou aumentar swap" if status != "OK" else "",
        "duration_ms": int((time.time() - start_time) * 1000)
    })
    
    # 3. Disco
    disk = psutil.disk_usage('/')
    start_time = time.time()
    status = "OK"
    severity = "low"
    if disk.percent > 90:
        status = "Crítico"
        severity = "critical"
    elif disk.percent > 80:
        status = "Atenção"
        severity = "medium"
        
    results.append({
        "module_name": "System",
        "test_name": "Espaço em Disco",
        "status": status,
        "severity": severity,
        "message": f"Disco C/ root está {disk.percent}% cheio.",
        "details": f"Livre: {disk.free / (1024**3):.1f}GB",
        "fix_suggestion": "Limpar logs e arquivos temporários" if status != "OK" else "",
        "duration_ms": int((time.time() - start_time) * 1000)
    })
    
    # 4. Permissões de escrita
    test_file = "/home/tokio/TokiOS/data/database/test_write.tmp"
    try:
        os.makedirs(os.path.dirname(test_file), exist_ok=True)
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        results.append({
            "module_name": "System",
            "test_name": "Permissões de Escrita",
            "status": "OK",
            "severity": "low",
            "message": "Permissão de escrita na pasta data/ ok.",
            "details": "",
            "fix_suggestion": "",
            "duration_ms": 10
        })
    except Exception as e:
        results.append({
            "module_name": "System",
            "test_name": "Permissões de Escrita",
            "status": "Crítico",
            "severity": "critical",
            "message": f"Sem permissão de escrita em data/: {e}",
            "details": "",
            "fix_suggestion": "Rodar chmod ou chown",
            "duration_ms": 10
        })

    return results
