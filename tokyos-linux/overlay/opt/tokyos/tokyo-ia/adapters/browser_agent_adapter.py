"""
Tokyo IA — Browser Agent Adapter
Abre URLs e faz dry-run de automação de navegador.
"""

import subprocess
import shlex

BROWSER = "chromium"

def open_url(url: str) -> dict:
    try:
        subprocess.Popen([BROWSER, url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return {"status": "ok", "message": f"Navegador abriu: {url}"}
    except FileNotFoundError:
        return {"status": "error", "message": f"Chromium não encontrado"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def dry_run_browser_task(task: str) -> dict:
    return {
        "status": "dry_run",
        "message": f"[DRY-RUN] Automação de navegador solicitada: {task}",
        "note": "Playwright não está ativo. Esta ação não foi executada.",
    }

def get_status() -> dict:
    import shutil
    found = shutil.which(BROWSER) is not None
    return {"tool": "browser_agent", "status": "active" if found else "unavailable", "browser": BROWSER}
