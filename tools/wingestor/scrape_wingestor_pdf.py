import os
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright
import pdfplumber

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

async def get_pdf_sales(start_date="2026-05-01", end_date="2026-05-31", local_id=""):
    env = load_env()
    email = env.get("WINGESTOR_EMAIL", "")
    password = env.get("WINGESTOR_PASSWORD", "")
    save_dir = os.path.join(str(Path.home()), "Documentos", "Relatorios_WinGestor")
    os.makedirs(save_dir, exist_ok=True)
    
    loja_nome = local_id if local_id else "consolidado"
    pdf_path = os.path.join(save_dir, f"relatorio_vendas_{start_date}_a_{end_date}_{loja_nome}.pdf")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()
        
        # 1. Login
        await page.goto("https://app.wingestor.com.br/login")
        await page.fill('input[type="email"]', email)
        await page.fill('input[type="password"]', password)
        await page.click('button[type="submit"]')
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(2)
        
        # 2. Navegar para Relatórios
        await page.goto("https://app.wingestor.com.br/relatorios")
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(2)
        
        # O form específico tem o action: https://app.wingestor.com.br/relatorios/relatorio-vendas
        # Preencher as datas
        # Playwright: fill date input requires YYYY-MM-DD
        await page.fill('form[action$="relatorio-vendas"] input[name="start_date"]', start_date)
        await page.fill('form[action$="relatorio-vendas"] input[name="end_date"]', end_date)
        
        # Preencher Estado="Aprovadas" e Local (Todos="", Riverside="12", Teresina="13")
        await page.select_option('form[action$="relatorio-vendas"] select[name="estado"]', "aprovado")
        if local_id:
            await page.select_option('form[action$="relatorio-vendas"] select[name="local_id"]', str(local_id))
            
        # O botão abre nova aba, vamos forçar na mesma página
        await page.evaluate('''() => {
            const form = document.querySelector('form[action$="relatorio-vendas"]');
            if(form) form.removeAttribute("target");
        }''')
        
        # 3. Interceptar Resultado
        pdf_data = []
        async def handle_response(response):
            try:
                # Se a resposta contiver PDF (seja GET ou POST, na mesma aba ou nova)
                if response.headers.get("content-type", "").startswith("application/pdf") or "relatorio" in response.url:
                    body = await response.body()
                    if body.startswith(b'%PDF'):
                        pdf_data.append(body)
            except Exception as e:
                pass
                    
        page.on("response", handle_response)
        
        # Clicar e aguardar passivamente sem travar o script
        await page.click('form[action$="relatorio-vendas"] button')
        await asyncio.sleep(8) # Dar 8 segundos generosos para o PDF ser gerado e trafegado
        
        if pdf_data:
            with open(pdf_path, "wb") as f:
                f.write(pdf_data[0])
        else:
            # Tentar via página atual caso seja apenas um viewer
            try:
                body = await page.pdf() # Gera PDF da página atual como fallback
                with open(pdf_path, "wb") as f:
                    f.write(body)
            except:
                pass
            
        await browser.close()
        
    # 4. Extração via PDFPlumber
    total_val = "0,00"
    if os.path.exists(pdf_path):
        with pdfplumber.open(pdf_path) as pdf:
            for page in reversed(pdf.pages): # O total geralmente está na última
                text = page.extract_text()
                if not text:
                    continue
                # Procurar padrões como: "Total Vendas", "Valor Total R$", "Total: 15.000,00"
                matches = re.findall(r'(?:R\$)?\s*([\d\.]+(?:,\d{2}))', text)
                if matches:
                    total_val = matches[-1] # O último valor costuma ser o grande total
                    break
    
    return total_val

async def main():
    import sys
    from datetime import datetime
    
    today = datetime.now().strftime("%Y-%m-%d")
    start_date = datetime.now().strftime("%Y-%m-01") # Sempre dia 01 do mês atual até hoje
    end_date = today
    
    results = {}
    print(f"Extraindo Vendas (Aprovadas) de {start_date} a {end_date}...")
    
    val_total = await get_pdf_sales(start_date=start_date, end_date=end_date, local_id="")
    val_riverside = await get_pdf_sales(start_date=start_date, end_date=end_date, local_id="12")
    val_teresina = await get_pdf_sales(start_date=start_date, end_date=end_date, local_id="13")
    
    results["Total"] = val_total
    results["Riverside"] = val_riverside
    results["Teresina"] = val_teresina
    
    import json
    print(json.dumps(results))

if __name__ == "__main__":
    asyncio.run(main())
