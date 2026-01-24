# syntax=docker/dockerfile:1.4
FROM node:lts AS builder

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && \
    corepack pnpm install

RUN npm install -g @nestjs/cli

COPY . .

RUN nest build osint && \
    nest build characters && \
    nest build guilds && \
    nest build warcraft-logs && \
    nest build wow-progress

FROM node:lts

ARG OCI_CREATED
ARG OCI_REVISION
ARG OCI_VERSION

LABEL org.opencontainers.image.title="CMNW OSINT" \
    org.opencontainers.image.description="OSINT - Intelligence always wins" \
    org.opencontainers.image.vendor="alexzedim" \
    org.opencontainers.image.url="https://cmnw.me" \
    org.opencontainers.image.source="https://github.com/alexzedim/cmnw" \
    org.opencontainers.image.documentation="https://github.com/alexzedim/cmnw#readme" \
    org.opencontainers.image.licenses="MPL-2.0" \
    org.opencontainers.image.logo="https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png" \
    org.opencontainers.image.base.name="node:lts" \
    org.opencontainers.image.created="${OCI_CREATED}" \
    org.opencontainers.image.revision="${OCI_REVISION}" \
    org.opencontainers.image.version="${OCI_VERSION}"

WORKDIR /usr/src/app

# Install Playwright system dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --gid 1001 app && \
    adduser --uid 1001 --gid 1001 --disabled-password --gecos '' app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && \
    corepack pnpm install --prod

COPY --from=builder /usr/src/app/dist ./dist

# Install Playwright and dependencies
RUN npx playwright install-deps && \
    npx playwright install chromium

RUN chown -R app:app /usr/src/app

USER app

CMD ["node", "dist/apps/osint/main.js"]



