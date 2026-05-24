import streamlit as st
from utils.data_utils import get_estoque
st.title("Controle de Estoque")
df = get_estoque()
st.dataframe(df)
