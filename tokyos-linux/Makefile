# Makefile — TokyOS Linux
# Targets:
#   make bundle    → Gera squashfs portátil (sem root)
#   make iso       → Gera ISO completa (requer sudo)
#   make dev       → Gera ISO em modo dev (mais rápido)
#   make docker    → Builda ISO via Docker (sem sudo no host)
#   make update    → Gera imagem de atualização
#   make clean     → Limpa artefatos de build

.PHONY: bundle iso dev docker update clean help

bundle:
	bash build/mktokyos-bundle.sh

iso:
	sudo ./build/mktokyos-iso.sh

dev:
	sudo ./build/mktokyos-iso.sh --dev

update:
	sudo ./build/mktokyos-update.sh

clean:
	rm -rf build/work* tokyos-runtime* tokyos-linux.iso tokyos-update.squashfs

help:
	@echo "TokyOS Linux Builder"
	@echo ""
	@echo "  make bundle    — Gera squashfs portátil (SEM root, funciona agora)"
	@echo "  make iso       — Gera ISO bootável completa (requer sudo)"
	@echo "  make dev       — Gera ISO em modo dev (mais rápido, requer sudo)"
	@echo "  make docker    — Builda ISO via Docker (sem sudo no host)"
	@echo "  make update    — Gera imagem de atualização OTA (requer sudo)"
	@echo "  make clean     — Remove artefatos de build"
	@echo ""
	@echo "Artefatos gerados:"
	@echo "  tokyos-runtime.squashfs  — Runtime portátil (extraia e execute)"
	@echo "  run-tokyos.sh            — Runner do runtime"
	@echo "  tokyos-linux.iso         — ISO bootável"
