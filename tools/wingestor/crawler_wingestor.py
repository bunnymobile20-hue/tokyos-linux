import os
import json
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
import urllib.parse

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

def is_target_url(url):
    targets = ['vendas', 'produtos', 'compras', 'caixa', 'conta-pagar', 'conta-receber', 'estoque', 'inventarios', 'relatorios']
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.lower()
    return any(target in path for target in targets)

async def crawl_wingestor():
    env = load_env()
    email = env.get("WINGESTOR_EMAIL", "")
    password = env.get("WINGESTOR_PASSWORD", "")
    
    manual_data = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        print("Fazendo login no WinGestor...")
        await page.goto("https://app.wingestor.com.br/login")
        await page.fill('input[type="email"]', email)
        await page.fill('input[type="password"]', password)
        await page.click('button[type="submit"]')
        
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(3)
        
        print("Coletando links do menu lateral...")
        links = await page.evaluate('''() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .map(a => a.href)
                .filter(href => href.includes('app.wingestor.com.br') && !href.includes('logout'));
        }''')
        
        unique_links = sorted(list(set(links)))
        target_links = [link for link in unique_links if is_target_url(link)]
        
        print(f"Encontrados {len(target_links)} links-alvo para mapear.")
        
        for i, link in enumerate(target_links, 1):
            print(f"[{i}/{len(target_links)}] Mapeando: {link}")
            try:
                await page.goto(link, wait_until="networkidle")
                await asyncio.sleep(2) # Dar tempo pro layout renderizar e requisições completarem
                
                # Extrair título
                title = await page.title()
                
                # Extrair elementos interativos importantes
                page_data = await page.evaluate('''() => {
                    const forms = Array.from(document.querySelectorAll('form')).map(f => {
                        const action = f.getAttribute('action') || '';
                        const id = f.id || '';
                        
                        const inputs = Array.from(f.querySelectorAll('input, select, textarea')).map(input => {
                            let type = input.tagName.toLowerCase();
                            if(type === 'input') type = input.getAttribute('type') || 'text';
                            return {
                                name: input.getAttribute('name') || '',
                                type: type,
                                id: input.id || '',
                                placeholder: input.getAttribute('placeholder') || ''
                            };
                        });
                        
                        const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(btn => {
                            return {
                                text: btn.innerText?.trim() || btn.value || '',
                                type: btn.getAttribute('type') || 'submit'
                            };
                        });
                        
                        return { action, id, inputs, buttons };
                    });
                    
                    const external_buttons = Array.from(document.querySelectorAll('a.btn, button:not(form button)')).map(btn => {
                        return {
                            text: btn.innerText?.trim() || '',
                            href: btn.getAttribute('href') || ''
                        };
                    });
                    
                    return { forms, external_buttons };
                }''')
                
                manual_data.append({
                    "url": link,
                    "title": title,
                    "forms": page_data["forms"],
                    "actions": page_data["external_buttons"]
                })
                
            except Exception as e:
                print(f"Erro ao mapear {link}: {e}")
                
        await browser.close()
        
    print("Mapeamento concluído. Salvando JSON...")
    with open("/home/tokio/TokiOS/tools/wingestor/wingestor_raw_manual.json", "w", encoding="utf-8") as f:
        json.dump(manual_data, f, ensure_ascii=False, indent=2)
        
if __name__ == "__main__":
    asyncio.run(crawl_wingestor())
