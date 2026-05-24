import os
import asyncio
from dotenv import load_dotenv
from browser_use import Agent, Browser

# Usando Gemini pois a GOOGLE_API_KEY foi fornecida
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

class MyGoogleChat(ChatGoogleGenerativeAI):
    @property
    def provider(self):
        return "google"

    @property
    def model_name(self):
        return self.model

async def main():
    # Instancia o browser de forma visível (headless=False)
    # Assim você consegue assistir ao que a IA está fazendo.
    browser = Browser()

    # Define o LLM a ser usado. Aqui está usando Gemini,
    # pois a GOOGLE_API_KEY foi fornecida no .env
    llm = MyGoogleChat(model="gemini-1.5-pro")

    # URL base que o agente deve interagir
    target_url = os.getenv("TARGET_URL", "http://localhost:3001/")

    # Define o agente com a tarefa desejada
    # Esta é a instrução de alto nível que será dada ao LLM.
    agent = Agent(
        task=f"""
        1. Vá para a página {target_url}
        2. Analise a interface inicial do painel.
        3. Identifique o formulário de login ou o estado inicial.
        4. Tente explorar a interface da forma mais segura e descritiva possível, listando os itens disponíveis.
        Se pedir senha, lembre-se que a senha padrão instalada é 32215820.
        """,
        llm=llm,
        browser=browser
    )

    print("Iniciando o agente... A janela do navegador deverá abrir em instantes.")
    await agent.run()

if __name__ == "__main__":
    asyncio.run(main())
