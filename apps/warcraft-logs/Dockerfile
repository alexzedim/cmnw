FROM node:lts-alpine


LABEL org.opencontainers.image.title = "WarcraftLogs"
LABEL org.opencontainers.image.vendor = "alexzedim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/AlexZeDim/cmnw"
LABEL org.opencontainers.image.licenses = "MPL-2.0"
LABEL org.opencontainers.image.description = "CMNW"

WORKDIR /usr/src/app

RUN apk add --no-cache git
RUN git clone https://github.com/AlexZeDim/cmnw-secrets.git
RUN mv cmnw-secrets/* .
RUN rm -rf cmnw-secrets

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./


RUN corepack pnpm install

COPY . .

RUN npm install -g @nestjs/cli
RUN corepack enable
RUN nest build warcraft-logs

CMD wait && ["node", "dist/apps/warcraft-logs/main.js"]





