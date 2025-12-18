# syntax=docker/dockerfile:1.4
FROM node:lts AS builder

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && \
    corepack pnpm install

RUN npm install -g @nestjs/cli

COPY . .

RUN nest build market && \
    nest build dma

FROM node:lts

LABEL org.opencontainers.image.description="DMA - Intelligence always wins"
LABEL org.opencontainers.image.base.name="node:lts"

WORKDIR /usr/src/app

RUN addgroup --gid 1001 app && \
    adduser --uid 1001 --gid 1001 --disabled-password --gecos '' app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && \
    corepack pnpm install --prod

COPY --from=builder /usr/src/app/dist ./dist

RUN chown -R app:app /usr/src/app

USER app

CMD ["node", "dist/apps/dma/main.js"]



