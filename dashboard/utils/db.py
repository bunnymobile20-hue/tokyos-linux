import sqlite3
import os

DB_PATH = '/home/tokio/TokiOS/data/database/bunnydreams.db'

def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def init_db():
    conn = get_connection()
    c = conn.cursor()
    
    # Tabela vendas
    c.execute('''
        CREATE TABLE IF NOT EXISTS vendas (
            id TEXT PRIMARY KEY,
            data TEXT,
            hora TEXT,
            loja TEXT,
            vendedor TEXT,
            valor_total REAL,
            quantidade_itens INTEGER,
            forma_pagamento TEXT,
            desconto REAL,
            taxa REAL,
            valor_liquido REAL,
            origem TEXT,
            documento TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabela itens_vendidos
    c.execute('''
        CREATE TABLE IF NOT EXISTS itens_vendidos (
            id TEXT PRIMARY KEY,
            venda_id TEXT,
            data TEXT,
            loja TEXT,
            produto_id TEXT,
            produto_nome TEXT,
            categoria TEXT,
            quantidade INTEGER,
            valor_unitario REAL,
            valor_total REAL,
            custo_unitario REAL,
            custo_total REAL,
            lucro_bruto REAL,
            margem_percentual REAL,
            vendedor TEXT
        )
    ''')
    
    # Tabela produtos
    c.execute('''
        CREATE TABLE IF NOT EXISTS produtos (
            id TEXT PRIMARY KEY,
            sku TEXT,
            codigo_barras TEXT,
            nome TEXT,
            categoria TEXT,
            marca TEXT,
            custo REAL,
            preco_venda REAL,
            margem REAL,
            status_pareto TEXT,
            ativo BOOLEAN
        )
    ''')
    
    # Tabela estoque
    c.execute('''
        CREATE TABLE IF NOT EXISTS estoque (
            id TEXT PRIMARY KEY,
            data TEXT,
            loja TEXT,
            produto_id TEXT,
            produto_nome TEXT,
            categoria TEXT,
            saldo_atual INTEGER,
            estoque_minimo INTEGER,
            custo_unitario REAL,
            valor_estoque_custo REAL,
            valor_estoque_venda REAL,
            status_estoque TEXT,
            dias_sem_venda INTEGER,
            giro_estimado REAL
        )
    ''')
    
    # Tabela dre
    c.execute('''
        CREATE TABLE IF NOT EXISTS dre (
            id TEXT PRIMARY KEY,
            periodo TEXT,
            loja TEXT,
            receita_bruta REAL,
            descontos REAL,
            taxas REAL,
            receita_liquida REAL,
            cmv REAL,
            lucro_bruto REAL,
            despesas_fixas REAL,
            despesas_variaveis REAL,
            despesas_pessoal REAL,
            despesas_marketing REAL,
            despesas_financeiras REAL,
            resultado_operacional REAL,
            margem_liquida REAL
        )
    ''')
    
    # Tabela metas
    c.execute('''
        CREATE TABLE IF NOT EXISTS metas (
            id TEXT PRIMARY KEY,
            periodo TEXT,
            loja TEXT,
            meta_mensal REAL,
            meta_diaria REAL,
            meta_semanal REAL
        )
    ''')
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
