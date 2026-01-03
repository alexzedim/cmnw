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
    nest build wow-progress

FROM node:lts

LABEL org.opencontainers.image.description="OSINT - Intelligence always wins"
LABEL org.opencontainers.image.base.name="node:lts"

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



