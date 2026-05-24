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

async def discover_links():
    env = load_env()
    email = env.get("WINGESTOR_EMAIL", "")
    password = env.get("WINGESTOR_PASSWORD", "")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        await page.goto("https://app.wingestor.com.br/login")
        await page.fill('input[type="email"]', email)
        await page.fill('input[type="password"]', password)
        await page.click('button[type="submit"]')
        
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(3)
        
        # Extrair todos os links do menu lateral
        links = await page.evaluate('''() => {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            return anchors.map(a => a.href).filter(href => href.includes('app.wingestor.com.br') && !href.includes('logout'));
        }''')
        
        unique_links = sorted(list(set(links)))
        print(f"Encontrados {len(unique_links)} links únicos.")
        for link in unique_links:
            print("-", link)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(discover_links())
