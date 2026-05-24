import streamlit as st

st.set_page_config(page_title="Bunny Dreams Dashboard", page_icon="🐰", layout="wide")

# Sidebar com menu de navegação
st.sidebar.title("📋 Menu Principal")
st.sidebar.markdown("Selecione uma opção abaixo:")

# Menu de navegação
pagina = st.sidebar.radio(
    "Navegação",
    ["🏠 Visão Geral", "🏪 Teresina", "🏪 Riverside", "💰 Financeiro", "📦 Estoque", "📈 Curva Pareto", "🚨 Alertas"]
)

# Redirecionamento baseado na seleção
if pagina == "🏠 Visão Geral":
    st.switch_page("pages/01_Visão_Geral.py")
elif pagina == "🏪 Teresina":
    st.switch_page("pages/02_Teresina.py")
elif pagina == "🏪 Riverside":
    st.switch_page("pages/03_Riverside.py")
elif pagina == "💰 Financeiro":
    st.switch_page("pages/04_Financeiro.py")
elif pagina == "📦 Estoque":
    st.switch_page("pages/05_Estoque.py")
elif pagina == "📈 Curva Pareto":
    st.switch_page("pages/06_Curva_Pareto.py")
elif pagina == "🚨 Alertas":
    st.switch_page("pages/07_Alertas.py")

# Página principal vazia - apenas para redirecionamento
st.markdown("# 🐰 Bunny Dreams Dashboard")
st.markdown("Use o menu lateral para navegar entre as diferentes visões do sistema.")
