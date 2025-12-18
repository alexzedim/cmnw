# syntax=docker/dockerfile:1.4
FROM node:lts AS builder

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && \
    corepack pnpm install

RUN npm install -g @nestjs/cli

COPY . .

RUN nest build core && \
    nest build api

FROM node:lts

LABEL org.opencontainers.image.title="CORE"
LABEL org.opencontainers.image.licenses="MPL-2.0"
LABEL org.opencontainers.image.vendor="alexzedim"
LABEL org.opencontainers.image.url="https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source="https://github.com/alexzedim/cmnw"
LABEL org.opencontainers.image.description="Intelligence always wins"

WORKDIR /usr/src/app

RUN addgroup --gid 1001 app && \
    adduser --uid 1001 --gid 1001 --disabled-password --gecos '' app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && \
    corepack pnpm install --prod

COPY --from=builder /usr/src/app/dist ./dist

RUN chown -R app:app /usr/src/app

USER app

CMD ["node", "dist/apps/core/main.js"]



