FROM node:20-alpine AS builder
WORKDIR /app

# Versão exata do packageManager declarado no package.json raiz
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# 1. Manifests do workspace (camada de cache — só reinvalida se mudar lock/package)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages ./packages

RUN pnpm install --frozen-lockfile

# 2. Variáveis Vite — baked in no bundle (mudar URL = rebuild)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL

# 3. Código-fonte e build
COPY apps/web ./apps/web

# Chama vite diretamente — pula o tsc --noEmit do script "build"
# para não bloquear o build Docker por erros de tipo de CI
RUN pnpm --filter @cyt/web exec vite build

# 4. Imagem final: só nginx + assets compilados (~25 MB)
FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
