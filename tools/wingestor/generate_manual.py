import json
from collections import defaultdict

def create_markdown():
    with open("/home/tokio/TokiOS/tools/wingestor/wingestor_raw_manual.json", "r") as f:
        data = json.load(f)
        
    md = "# Manual de Navegação e Interação - WinGestor\n\n"
    md += "Este manual contém o mapeamento dos formulários, botões e campos de entrada das principais telas do WinGestor, desenhado para orientar robôs de automação.\n\n"
    
    for page in data:
        md += f"## {page['title']} (`{page['url']}`)\n\n"
        
        valid_forms = [f for f in page['forms'] if f['action'] and 'logout' not in f['action']]
        
        if valid_forms:
            md += "### Formulários\n"
            for form in valid_forms:
                action = form['action']
                md += f"- **Ação do Formulário:** `{action}`\n"
                
                inputs = [i for i in form['inputs'] if i['type'] != 'hidden' and i['name']]
                if inputs:
                    md += "  - **Campos de Entrada:**\n"
                    for inp in inputs:
                        name = inp['name']
                        tipo = inp['type']
                        placeholder = inp.get('placeholder', '')
                        md += f"    - `name=\"{name}\"` (Tipo: `{tipo}`)"
                        if placeholder:
                            md += f" - Placeholder: \"{placeholder}\""
                        md += "\n"
                        
                buttons = [b for b in form['buttons'] if b['text']]
                if buttons:
                    md += "  - **Botões do Formulário:**\n"
                    for btn in buttons:
                        md += f"    - `{btn['text']}` (Tipo: `{btn['type']}`)\n"
            md += "\n"
            
        valid_actions = [a for a in page['actions'] if a['text'] and a['href'] and '#' not in a['href'] and len(a['text']) > 1]
        
        # Deduplicate actions
        unique_actions = []
        seen = set()
        for a in valid_actions:
            if a['text'] not in seen:
                seen.add(a['text'])
                unique_actions.append(a)
                
        if unique_actions:
            md += "### Links e Botões de Ação\n"
            for act in unique_actions:
                md += f"- `{act['text']}` -> Navega para `{act['href']}`\n"
                
        md += "---\n\n"
        
    with open("/home/tokio/Documentos/Relatorios_WinGestor/wingestor_manual.md", "w") as f:
        f.write(md)
        
    with open("/home/tokio/TokiOS/.agents/skills/wingestor-manual/SKILL.md", "w") as f:
        f.write(md)

import os
os.makedirs("/home/tokio/TokiOS/.agents/skills/wingestor-manual", exist_ok=True)
create_markdown()
print("Manual gerado em Markdown.")
