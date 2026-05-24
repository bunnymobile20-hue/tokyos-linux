import streamlit as st
import sqlite3
import pandas as pd
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from tools.health_check.runner import run_health_check

st.set_page_config(page_title="AutoTeste Tokyo IA", layout="wide", page_icon="🩺")
st.title("🩺 AutoTeste Tokyo IA")

DB_PATH = "/home/tokio/TokiOS/data/database/tokyo.db"

def get_latest_run():
    if not os.path.exists(DB_PATH): return None
    conn = sqlite3.connect(DB_PATH)
    run = pd.read_sql_query("SELECT * FROM health_check_runs ORDER BY started_at DESC LIMIT 1", conn)
    conn.close()
    if run.empty: return None
    return run.iloc[0]

def get_results(run_id):
    conn = sqlite3.connect(DB_PATH)
    res = pd.read_sql_query("SELECT * FROM health_check_results WHERE run_id = ?", conn, params=(run_id,))
    conn.close()
    return res

# --- Header Controls ---
col1, col2, col3 = st.columns([1, 1, 1])
if col1.button("▶️ Executar AutoTeste Completo", use_container_width=True, type="primary"):
    with st.spinner("Executando todos os diagnósticos..."):
        run_health_check(is_quick_mode=False)
        st.success("AutoTeste Finalizado!")
if col2.button("⚡ Executar AutoTeste Rápido", use_container_width=True):
    with st.spinner("Executando diagnósticos rápidos..."):
        run_health_check(is_quick_mode=True)
        st.success("AutoTeste Rápido Finalizado!")
if col3.button("📄 Ver Logs Técnicos", use_container_width=True):
    st.info("Logs técnicos não implementados na interface web. Verifique `logs/autoteste.log`.")

st.markdown("---")

latest = get_latest_run()

if not latest is None:
    # --- KPIs ---
    st.subheader("Saúde Geral do Sistema")
    c1, c2, c3, c4, c5 = st.columns(5)
    
    score_color = "normal"
    if latest['overall_score'] < 50: score_color = "inverse"
    
    c1.metric("Saúde", f"{latest['overall_score']:.1f}%")
    c2.metric("Status", latest['overall_status'])
    c3.metric("Testes OK", str(latest['ok_count']))
    c4.metric("Alertas", str(latest['warning_count']))
    c5.metric("Erros", str(latest['error_count'] + latest['critical_count']))
    
    st.caption(f"Último teste: {latest['finished_at']} (Duração: {latest['duration_ms']}ms)")
    
    # --- Tabela de Resultados ---
    st.markdown("### 📋 Resultados Detalhados")
    
    filter_col1, filter_col2 = st.columns([1, 3])
    status_filter = filter_col1.selectbox("Filtrar Status", ["Todos", "OK", "Atenção", "Erro", "Crítico", "Não configurado"])
    
    df_res = get_results(latest['id'])
    
    if status_filter != "Todos":
        df_res = df_res[df_res['status'] == status_filter]
        
    if not df_res.empty:
        # Formatar dataframe para exibição
        display_df = df_res[['module_name', 'test_name', 'status', 'severity', 'message', 'fix_suggestion', 'duration_ms']].copy()
        
        # Colorir via Pandas Styler
        def color_status(val):
            color = 'black'
            if val == 'OK': color = 'green'
            elif val == 'Atenção': color = 'orange'
            elif val in ['Erro', 'Crítico']: color = 'red'
            elif val == 'Não configurado': color = 'gray'
            return f'color: {color}; font-weight: bold'
            
        st.dataframe(display_df.style.map(color_status, subset=['status']), use_container_width=True, height=600)
    else:
        st.write("Nenhum resultado para este filtro.")
        
else:
    st.info("Nenhum AutoTeste executado ainda. Clique no botão acima para iniciar.")
