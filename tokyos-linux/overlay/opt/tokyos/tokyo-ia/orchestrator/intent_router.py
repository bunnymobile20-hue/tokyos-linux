"""
Tokyo IA — Intent Router
Classifica a intenção de um comando usando regras simples.
Extensível: depois podemos conectar LLM.
"""

import re
from typing import Optional

INTENTS = [
    "open_page",
    "search_web",
    "extract_report",
    "save_memory",
    "create_task",
    "run_workflow",
    "check_system",
    "ask_agent",
    "automate_browser",
    "unknown",
]

_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"(abre|abrir|vai pra|navegar|acessar?)\s*(o\s*)?(win gestor|wingestor)"), "open_page"),
    (re.compile(r"(abre|abrir|vai pra|navegar|acessar)\s"), "open_page"),
    (re.compile(r"(pesquis[ae]|busca|procura|pesquisa sobre|pesquise sobre)"), "search_web"),
    (re.compile(r"(relat[oó]rio|relatorio|puxa|extrai|extrair|relat[oó]rio de vendas)"), "extract_report"),
    (re.compile(r"(lembra|salva na mem[oó]ria|guarda|memoriza|nao esquec[ae])"), "save_memory"),
    (re.compile(r"(cria|crie|criar|adiciona?)\s*(tarefa|task)"), "create_task"),
    (re.compile(r"(cria|crie|adiciona)\s"), "create_task"),
    (re.compile(r"(roda|executa|dispara|iniciar|start)\s*(workflow|rotina|fluxo)"), "run_workflow"),
    (re.compile(r"(verifica|checa|status|como est[áa]|health|sistema)"), "check_system"),
    (re.compile(r"(pergunta|consulta|agente|hermes|paperclip)"), "ask_agent"),
    (re.compile(r"(automatiza|automac?[aã]o|navegador|browser|robot)"), "automate_browser"),
]


def classify(raw_text: str) -> str:
    text = raw_text.lower().strip()
    for pattern, intent in _RULES:
        if pattern.search(text):
            return intent
    return "unknown"


def get_confidence(raw_text: str, intent: str) -> float:
    if intent == "unknown":
        return 0.3
    word_count = len(raw_text.split())
    if word_count < 2:
        return 0.5
    return 0.85
