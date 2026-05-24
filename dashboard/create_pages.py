import os

pages_dir = "/home/tokio/TokiOS/dashboard/pages"

templates = {
    "02_Teresina.py": """import streamlit as st
from utils.data_utils import get_vendas_geral
st.set_page_config(page_title="Teresina", layout="wide")
st.title("Loja: Teresina")
df = get_vendas_geral("Teresina")
st.write(f"Vendas totais: {df['valor_liquido'].sum() if not df.empty else 0}")
""",
    "03_Riverside.py": """import streamlit as st
from utils.data_utils import get_vendas_geral
st.set_page_config(page_title="Riverside", layout="wide")
st.title("Loja: Riverside")
df = get_vendas_geral("Riverside")
st.write(f"Vendas totais: {df['valor_liquido'].sum() if not df.empty else 0}")
""",
    "04_Financeiro.py": """import streamlit as st
st.set_page_config(page_title="Financeiro", layout="wide")
st.title("Financeiro: DRE e Fluxo de Caixa")
st.info("Página em desenvolvimento")
""",
    "05_Estoque.py": """import streamlit as st
from utils.data_utils import get_estoque
st.set_page_config(page_title="Estoque", layout="wide")
st.title("Controle de Estoque")
df = get_estoque()
st.dataframe(df)
""",
    "06_Curva_Pareto.py": """import streamlit as st
st.set_page_config(page_title="Curva Pareto", layout="wide")
st.title("Análise de Pareto (80/20)")
st.info("Página em desenvolvimento")
""",
    "07_Alertas.py": """import streamlit as st
st.set_page_config(page_title="Alertas", layout="wide")
st.title("Central de Alertas")
st.warning("Produto X está com estoque zerado.")
"""
}

for name, content in templates.items():
    with open(os.path.join(pages_dir, name), "w") as f:
        f.write(content)

print("Pages created.")
