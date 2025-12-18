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
    nest build analytics && \
    nest build guilds && \
    nest build wow-progress

FROM node:lts

LABEL org.opencontainers.image.description="OSINT - Intelligence always wins"
LABEL org.opencontainers.image.base.name="node:lts"

WORKDIR /usr/src/app

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg ca-certificates fonts-liberation libasound2 \
    libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgtk-3-0 libnspr4 libnss3 \
    libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 \
    libxrandr2 xvfb chromium-browser \
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



