import streamlit as st
import pandas as pd
import plotly.express as px
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.data_utils import get_vendas_geral, get_itens_vendidos, get_estoque

st.title("📊 Visão Geral Consolidada")

# Filtros na área principal
st.header("Filtros")
periodo = st.selectbox("Período", ["Mês Atual", "Hoje", "Ontem", "Semana Atual", "Ano Atual", "Personalizado"])

df_vendas = get_vendas_geral()
df_itens = get_itens_vendidos()
df_estoque = get_estoque()

if df_vendas.empty:
    st.warning("Nenhuma venda encontrada.")
else:
    # Converter datas
    df_vendas['data'] = pd.to_datetime(df_vendas['data'])
    
    # KPIs Básicos
    faturamento = df_vendas['valor_liquido'].sum()
    meta = 200000.0 # Meta hardcoded por enquanto
    gap = meta - faturamento
    lucro = df_itens['lucro_bruto'].sum()
    produtos_criticos = len(df_estoque[df_estoque['saldo_atual'] <= df_estoque['estoque_minimo']])

    col1, col2, col3, col4, col5 = st.columns(5)
    
    col1.metric("Faturamento Total", f"R$ {faturamento:,.2f}".replace(',','_').replace('.',',').replace('_','.'))
    col2.metric("Meta Total", f"R$ {meta:,.2f}".replace(',','_').replace('.',',').replace('_','.'))
    col3.metric("GAP Total", f"R$ {gap:,.2f}".replace(',','_').replace('.',',').replace('_','.'), delta=f"-R$ {gap:,.2f}", delta_color="inverse")
    col4.metric("Lucro Bruto", f"R$ {lucro:,.2f}".replace(',','_').replace('.',',').replace('_','.'))
    col5.metric("Prod. Críticos (Estoque)", str(produtos_criticos))

    st.markdown("---")
    
    # Gráficos
    col_chart1, col_chart2 = st.columns(2)
    
    vendas_por_loja = df_vendas.groupby('loja')['valor_liquido'].sum().reset_index()
    fig_loja = px.pie(vendas_por_loja, values='valor_liquido', names='loja', title="Faturamento por Loja", hole=0.4, color_discrete_sequence=['#f472b6', '#38bdf8'])
    col_chart1.plotly_chart(fig_loja, use_container_width=True)
    
    vendas_por_dia = df_vendas.groupby('data')['valor_liquido'].sum().reset_index()
    fig_dia = px.line(vendas_por_dia, x='data', y='valor_liquido', title="Vendas Diárias", markers=True)
    col_chart2.plotly_chart(fig_dia, use_container_width=True)
    
    st.subheader("Top 10 Produtos Mais Vendidos")
    top_produtos = df_itens.groupby('produto_nome')['quantidade'].sum().reset_index().sort_values(by='quantidade', ascending=False).head(10)
    st.dataframe(top_produtos, use_container_width=True)
