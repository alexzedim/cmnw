FROM node:lts

LABEL org.opencontainers.image.title="OSINT"
LABEL org.opencontainers.image.licenses="MPL-2.0"
LABEL org.opencontainers.image.vendor="alexzedim"
LABEL org.opencontainers.image.url="https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source="https://github.com/alexzedim/cmnw"
LABEL org.opencontainers.image.description="Intelligence always wins"

WORKDIR /usr/src/app

# Update system packages and install required dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Installing private github packages #
ARG CR_PAT
RUN echo @alexzedim:registry=https://npm.pkg.github.com/ >> ~/.npmrc
RUN echo //npm.pkg.github.com/:_authToken=${CR_PAT} >> ~/.npmrc

RUN corepack enable
RUN corepack pnpm install

COPY . .

RUN npm install -g @nestjs/cli

# Installing playwright - updated approach for version 1.53.1+
RUN npx playwright install-deps
RUN npx playwright install chromium

RUN nest build characters \
  && nest build guilds \
  && nest build osint \
  && nest build wow-progress \
  && nest build warcraft-logs

CMD ["node"]



