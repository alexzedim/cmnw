FROM node:22.15-alpine

LABEL org.opencontainers.image.title = "CMNW"
LABEL org.opencontainers.image.vendor = "alexzedim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/alexzedim/cmnw"

WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli
RUN corepack enable

COPY ../package.json ../pnpm-lock.yaml ./
COPY ../pnpm-workspace.yaml ./
RUN corepack pnpm install

COPY .. .

RUN nest build api \
  && nest build osint \
  && nest build dma \
  && nest build core \
  && nest build items \
  && nest build ladder \
  && nest build guilds \
  && nest build market \
  && nest build valuations \
  && nest build characters \
  && nest build wow-progress \
  && nest build warcraft-logs

CMD wait && ["node"]

