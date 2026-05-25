"""
Tokyo IA — System Monitor Adapter
Status do sistema operacional e serviços.
"""

import subprocess
import shlex


def _run(cmd: list[str]) -> str:
    try:
        return subprocess.check_output(cmd, timeout=10).decode().strip()
    except Exception:
        return "indisponível"


def get_hardware() -> dict:
    cpu = _run(["bash", "-c", "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'"])
    mem = _run(["bash", "-c", "free -m | awk 'NR==2{printf \"%d/%dMB (%.0f%%)\", $3, $2, $3*100/$2}'"])
    disk = _run(["bash", "-c", "df -h / | awk 'NR==2{print $3\"/\"$2\" (\"$5\")\"}'"])
    uptime = _run(["uptime", "-p"])
    return {"cpu": cpu, "memory": mem, "disk": disk, "uptime": uptime}


def get_services() -> list[dict]:
    services = ["tokyos-backend", "tokyos-firstboot", "NetworkManager", "gdm3"]
    results = []
    for svc in services:
        try:
            subprocess.run(["systemctl", "is-active", svc], capture_output=True, timeout=5)
            status = "active"
        except Exception:
            status = "unknown"
        results.append({"name": svc, "status": status})
    return results


def check_health() -> dict:
    hw = get_hardware()
    svc = get_services()
    return {"hardware": hw, "services": svc}


def get_status() -> dict:
    return {"tool": "system_monitor", "status": "active"}
