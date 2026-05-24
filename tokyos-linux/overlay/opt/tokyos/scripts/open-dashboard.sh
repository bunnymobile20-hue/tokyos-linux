#!/bin/bash
# Abre o dashboard TokyOS no navegador padrão
URL="${1:-http://127.0.0.1:3001}"
xdg-open "$URL"
