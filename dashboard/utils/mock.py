import sqlite3
import random
import uuid
from datetime import datetime, timedelta
import os
from db import get_connection, init_db

def generate_mock_data():
    conn = get_connection()
    c = conn.cursor()
    
    # Limpar tabelas existentes
    c.execute('DELETE FROM vendas')
    c.execute('DELETE FROM itens_vendidos')
    c.execute('DELETE FROM produtos')
    c.execute('DELETE FROM estoque')
    c.execute('DELETE FROM dre')
    c.execute('DELETE FROM metas')
    
    lojas = ['Teresina', 'Riverside']
    categorias = ['Vestidos', 'Blusas', 'Acessórios', 'Sapatos']
    
    # Gerar Produtos
    produtos = []
    for i in range(1, 51):
        custo = random.uniform(20.0, 100.0)
        margem = random.uniform(1.5, 3.0)
        preco = custo * margem
        p = {
            'id': str(uuid.uuid4()),
            'sku': f'BD-{i:03d}',
            'codigo_barras': f'789{i:09d}',
            'nome': f'Produto Bunny {i}',
            'categoria': random.choice(categorias),
            'marca': 'Bunny Dreams',
            'custo': custo,
            'preco_venda': preco,
            'margem': margem,
            'status_pareto': 'Pareto' if i <= 10 else 'Normal',
            'ativo': True
        }
        produtos.append(p)
        c.execute('''
            INSERT INTO produtos (id, sku, codigo_barras, nome, categoria, marca, custo, preco_venda, margem, status_pareto, ativo)
            VALUES (:id, :sku, :codigo_barras, :nome, :categoria, :marca, :custo, :preco_venda, :margem, :status_pareto, :ativo)
        ''', p)
    
    # Gerar Estoque
    for p in produtos:
        for loja in lojas:
            saldo = random.randint(0, 50)
            c.execute('''
                INSERT INTO estoque (id, data, loja, produto_id, produto_nome, categoria, saldo_atual, estoque_minimo, custo_unitario, valor_estoque_custo, valor_estoque_venda, status_estoque)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (str(uuid.uuid4()), datetime.now().strftime('%Y-%m-%d'), loja, p['id'], p['nome'], p['categoria'], saldo, 5, p['custo'], saldo * p['custo'], saldo * p['preco_venda'], 'Crítico' if saldo == 0 else 'Normal'))
            
    # Gerar Vendas (Últimos 30 dias)
    start_date = datetime.now() - timedelta(days=30)
    for _ in range(500):
        data_venda = start_date + timedelta(days=random.randint(0, 30))
        loja = random.choice(lojas)
        venda_id = str(uuid.uuid4())
        
        qtd_itens = random.randint(1, 5)
        valor_total = 0
        custo_total_venda = 0
        
        for _ in range(qtd_itens):
            p = random.choice(produtos)
            qtd = random.randint(1, 3)
            v_total = qtd * p['preco_venda']
            c_total = qtd * p['custo']
            lucro = v_total - c_total
            margem_pct = (lucro / v_total) * 100
            
            valor_total += v_total
            custo_total_venda += c_total
            
            c.execute('''
                INSERT INTO itens_vendidos (id, venda_id, data, loja, produto_id, produto_nome, categoria, quantidade, valor_unitario, valor_total, custo_unitario, custo_total, lucro_bruto, margem_percentual, vendedor)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (str(uuid.uuid4()), venda_id, data_venda.strftime('%Y-%m-%d'), loja, p['id'], p['nome'], p['categoria'], qtd, p['preco_venda'], v_total, p['custo'], c_total, lucro, margem_pct, 'Vendedora Teste'))
            
        c.execute('''
            INSERT INTO vendas (id, data, hora, loja, vendedor, valor_total, quantidade_itens, forma_pagamento, desconto, taxa, valor_liquido)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (venda_id, data_venda.strftime('%Y-%m-%d'), '14:00', loja, 'Vendedora Teste', valor_total, qtd_itens, 'Cartão de Crédito', 0, valor_total * 0.03, valor_total * 0.97))
        
    # Inserir Metas
    for loja in lojas:
        c.execute('INSERT INTO metas (id, periodo, loja, meta_mensal, meta_diaria) VALUES (?, ?, ?, ?, ?)',
                  (str(uuid.uuid4()), datetime.now().strftime('%Y-%m'), loja, 100000.0, 3333.33))
                  
    conn.commit()
    conn.close()

if __name__ == '__main__':
    generate_mock_data()
    print("Mock data generated.")
