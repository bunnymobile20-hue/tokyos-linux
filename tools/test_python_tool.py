import json

def analisar_vendas():
    print("--- INICIANDO FERRAMENTA PYTHON (Cálculo e Análise) ---")
    print("[Python] Processando dados brutos do WinGestor...")
    
    # Simulação de dados coletados
    dados_simulados = {
        "vendas_hoje": 2430.00,
        "meta_hoje": 3000.00,
        "despesas": 400.00,
        "cmv": 1000.00
    }
    
    # Cálculos
    gap = dados_simulados['meta_hoje'] - dados_simulados['vendas_hoje']
    lucro_bruto = dados_simulados['vendas_hoje'] - dados_simulados['cmv']
    resultado_operacional = lucro_bruto - dados_simulados['despesas']
    meta_atingida = (dados_simulados['vendas_hoje'] / dados_simulados['meta_hoje']) * 100
    
    print("[Python] Cálculos de KPIs finalizados.")
    
    relatorio = {
        "Venda Hoje": f"R$ {dados_simulados['vendas_hoje']:.2f}",
        "Meta Hoje": f"R$ {dados_simulados['meta_hoje']:.2f}",
        "GAP": f"R$ {gap:.2f}",
        "Meta Atingida": f"{meta_atingida:.1f}%",
        "Resultado Operacional (Lucro)": f"R$ {resultado_operacional:.2f}"
    }
    
    print("[Python] Resultado da análise (pronto para LibreOffice):")
    print(json.dumps(relatorio, indent=2, ensure_ascii=False))
    print("---------------------------------------------------\n")

if __name__ == "__main__":
    analisar_vendas()
