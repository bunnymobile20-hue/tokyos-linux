import os
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

def load_env():
    env_path = os.path.join(str(Path.home()), '.clawos', '.env')
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line:
                    k, v = line.strip().split('=', 1)
                    env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

async def map_page():
    env = load_env()
    email = env.get("WINGESTOR_EMAIL", "")
    password = env.get("WINGESTOR_PASSWORD", "")
    
    async with async_playwright() as p:
        print("Iniciando navegador em modo headless para mapeamento...")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        print("Acessando página de login...")
        await page.goto("https://app.wingestor.com.br/login")
        await page.fill('input[type="email"]', email)
        await page.fill('input[type="password"]', password)
        await page.click('button[type="submit"]')
        
        print("Aguardando login concluir...")
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(3)
        
        print("Navegando para a área de relatórios...")
        await page.goto("https://app.wingestor.com.br/relatorios")
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(3)
        
        print("Extraindo estrutura HTML dos formulários de filtro...")
        
        forms_html = await page.evaluate('''() => {
            const forms = document.querySelectorAll('form');
            let result = '';
            forms.forEach((f, i) => {
                result += `\\n--- FORMULÁRIO ${i+1} (Action: ${f.getAttribute('action')}) ---\\n`;
                const elements = f.querySelectorAll('input, select, button');
                elements.forEach(el => {
                    const tag = el.tagName.toLowerCase();
                    const name = el.getAttribute('name') || 'SEM_NOME';
                    const type = el.getAttribute('type') || '';
                    const id = el.getAttribute('id') || '';
                    const cls = el.className || '';
                    
                    let optionsInfo = '';
                    if (tag === 'select') {
                        const opts = el.querySelectorAll('option');
                        let values = [];
                        for(let j=0; j<Math.min(opts.length, 5); j++) {
                            values.push(`"${opts[j].text}": ${opts[j].value}`);
                        }
                        optionsInfo = ` -> [Opções: ${values.join(', ')}...]`;
                    }
                    
                    result += `<${tag} name="${name}" type="${type}" id="${id}" class="${cls}">${optionsInfo}\\n`;
                });
            });
            return result;
        }''')
        
        print("\n================ ESTRUTURA ENCONTRADA ================")
        if not forms_html.strip():
            print("Nenhum formulário encontrado. Salvando a página inteira para debug.")
            body_html = await page.content()
            with open("/tmp/wingestor_relatorios.html", "w") as f:
                f.write(body_html)
            print("Página salva em /tmp/wingestor_relatorios.html")
        else:
            print(forms_html)
        print("======================================================")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(map_page())
