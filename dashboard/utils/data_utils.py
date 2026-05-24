import pandas as pd
import sqlite3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.db import get_connection

def load_data(query, params=None):
    conn = get_connection()
    if params:
        df = pd.read_sql_query(query, conn, params=params)
    else:
        df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def get_vendas_geral(loja=None):
    if loja:
        return load_data("SELECT * FROM vendas WHERE loja = ?", (loja,))
    return load_data("SELECT * FROM vendas")

def get_itens_vendidos(loja=None):
    if loja:
        return load_data("SELECT * FROM itens_vendidos WHERE loja = ?", (loja,))
    return load_data("SELECT * FROM itens_vendidos")

def get_estoque(loja=None):
    if loja:
        return load_data("SELECT * FROM estoque WHERE loja = ?", (loja,))
    return load_data("SELECT * FROM estoque")

def get_produtos():
    return load_data("SELECT * FROM produtos")
