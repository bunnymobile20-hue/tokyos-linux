import os
import asyncio
from playwright.async_api import async_playwright
from pathlib import Path

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

async def main():
    env = load_env()
    email = env.get("WINGESTOR_EMAIL", "")
    password = env.get("WINGESTOR_PASSWORD", "")
    url = "https://app.wingestor.com.br/login"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        await page.goto(url)
        await page.fill('input[type="email"]', email)
        await page.fill('input[type="password"]', password)
        await page.click('button[type="submit"]')
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(2)
        
        # Obter todos os links do menu principal
        links = await page.evaluate('''() => {
            let anchors = Array.from(document.querySelectorAll('a'));
            return anchors.map(a => ({ text: a.innerText.trim(), href: a.href })).filter(a => a.text !== '');
        }''')
        
        import json
        with open("/home/tokio/TokiOS/tools/wingestor/links.json", "w") as f:
            json.dump(links, f, indent=2)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
