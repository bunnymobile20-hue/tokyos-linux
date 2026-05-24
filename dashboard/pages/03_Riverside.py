import streamlit as st
from utils.data_utils import get_vendas_geral
st.title("Loja: Riverside")
df = get_vendas_geral("Riverside")
st.write(f"Vendas totais: {df['valor_liquido'].sum() if not df.empty else 0}")
