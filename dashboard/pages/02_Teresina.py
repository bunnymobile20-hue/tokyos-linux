import streamlit as st
from utils.data_utils import get_vendas_geral
st.title("Loja: Teresina")
df = get_vendas_geral("Teresina")
st.write(f"Vendas totais: {df['valor_liquido'].sum() if not df.empty else 0}")
