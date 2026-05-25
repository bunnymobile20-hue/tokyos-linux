# Voice to Action

## Como Funciona

1. Usuário fala com o assistente de voz (Tokyo Voice)
2. Áudio é transcrito para texto (STT)
3. Texto é enviado para `POST /tokyo/command` via Voice Adapter
4. Comando passa pelo pipeline normal (Intent → Tool → Action → Memory)
5. Resultado volta para o usuário

## Voice Adapter

Arquivo: `adapters/voice_adapter.py`

```python
from adapters.voice_adapter import handle_transcribed_text

result = handle_transcribed_text("abre o WinGestor", user="waldyr")
# → command_id, intent, tool, status
```

## Nesta Fase

- **STT real**: não implementado ainda (futuro)
- **Entrada mock**: texto digitado simula fala
- **Saída**: comando processado pelo pipeline completo

## Fluxo

```
Fala → STT (futuro) → Texto → Voice Adapter → POST /tokyo/command
                                                    ↓
                                            Intent Router
                                                    ↓
                                            Action Executor
                                                    ↓
                                            Memory Loop
                                                    ↓
                                            Resposta
```

## Próximos Passos

1. Integrar STT (Whisper / Google Speech / Vosk)
2. Loop de confirmação para ações críticas
3. Feedback por voz (TTS)
