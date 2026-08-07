# syntax=docker/dockerfile:1.4
FROM node:24 AS builder

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && \
    corepack prepare pnpm@11.20.0 --activate && \
    corepack pnpm install

COPY . .

RUN corepack pnpm run build:all

FROM node:24

ARG OCI_CREATED
ARG OCI_REVISION
ARG OCI_VERSION

LABEL org.opencontainers.image.title="CMNW Core" \
    org.opencontainers.image.description="CORE - Intelligence always wins" \
    org.opencontainers.image.vendor="alexzedim" \
    org.opencontainers.image.url="https://cmnw.me" \
    org.opencontainers.image.source="https://github.com/alexzedim/cmnw" \
    org.opencontainers.image.documentation="https://github.com/alexzedim/cmnw#readme" \
    org.opencontainers.image.licenses="MPL-2.0" \
    org.opencontainers.image.logo="https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png" \
    org.opencontainers.image.base.name="node:24" \
    org.opencontainers.image.created="${OCI_CREATED}" \
    org.opencontainers.image.revision="${OCI_REVISION}" \
    org.opencontainers.image.version="${OCI_VERSION}"

WORKDIR /usr/src/app

RUN addgroup --gid 1001 app && \
    adduser --uid 1001 --gid 1001 --disabled-password --gecos '' app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && \
    corepack prepare pnpm@11.20.0 --activate && \
    corepack pnpm install --prod

COPY --from=builder /usr/src/app/dist ./dist

RUN chown -R app:app /usr/src/app

USER app

CMD ["node", "dist/apps/core/src/main.js"]
