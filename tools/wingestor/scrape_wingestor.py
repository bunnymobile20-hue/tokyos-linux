import os
import asyncio
from playwright.async_api import async_playwright
from pathlib import Path
import re

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

async def get_real_wingestor_sales():
    env = load_env()
    email = env.get("WINGESTOR_EMAIL", "")
    password = env.get("WINGESTOR_PASSWORD", "")
    url = "https://app.wingestor.com.br/login"

    results = {}
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        await page.goto(url)
        await page.fill('input[type="email"], input[name="email"]', email)
        await page.fill('input[type="password"], input[name="password"]', password)
        await page.click('button[type="submit"], input[type="submit"], button:has-text("Entrar")')
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(2)
        
        async def extract_val():
            elem = await page.locator("text='Total de vendas Maio R$ '").locator("xpath=..").inner_text()
            match = re.search(r'R\$\s*([\d\.]+,\d{2})', elem)
            if match:
                return match.group(1)
            return elem.split("\n")[1].strip() if "\n" in elem else elem

        # Todos os Locais
        await page.select_option("#inp-local_id", "")
        await asyncio.sleep(2)
        results["Total"] = await extract_val()

        # Riverside
        await page.select_option("#inp-local_id", "12")
        await asyncio.sleep(2)
        results["Riverside"] = await extract_val()

        # Teresina
        await page.select_option("#inp-local_id", "13")
        await asyncio.sleep(2)
        results["Teresina"] = await extract_val()

        await browser.close()
        
    return results

if __name__ == "__main__":
    import json
    sales = asyncio.run(get_real_wingestor_sales())
    print(json.dumps(sales))
