FROM node:lts

LABEL org.opencontainers.image.title = "CORE"
LABEL org.opencontainers.image.licenses = "MPL-2.0"
LABEL org.opencontainers.image.vendor = "alexzedim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/alexzedim/cmnw"
LABEL org.opencontainers.image.description = "Intelligence always wins"

WORKDIR /usr/src/app

# Copy package files first for better Docker layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Enable corepack before using it
RUN corepack enable


# Install dependencies
RUN corepack pnpm install

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy source code
COPY . .

RUN nest build core

CMD ["node"]



