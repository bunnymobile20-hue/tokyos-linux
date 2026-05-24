# Dockerfile — Build da ISO TokyOS Linux
# Uso: docker build -t tokyos-builder . && docker run --privileged tokyos-builder
# A ISO sai em /output/tokyos-linux.iso

FROM debian:bookworm AS builder

# Dependências de build
RUN apt-get update && apt-get install -y \
    debootstrap squashfs-tools xorriso grub-pc-bin \
    grub-efi-amd64-bin mtools curl git \
    nodejs npm python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copia o projeto
COPY . .

# Build do frontend
RUN cd frontend && npm ci && npm run build

# Compila backend (se TypeScript)
RUN cd backend && [ -f tsconfig.json ] && npx tsc || true

# Gera a ISO (sem sudo — já somos root no container)
RUN cd tokyos-linux && bash build/mktokyos-iso.sh

# ============================================================
# Estágio final: só a ISO
# ============================================================
FROM scratch AS output
COPY --from=builder /build/tokyos-linux/tokyos-linux.iso /tokyos-linux.iso

# Para extrair: docker create --name tokyos-iso tokyos-builder && docker cp tokyos-iso:/tokyos-linux.iso .
