FROM arm64v8/node:lts


LABEL org.opencontainers.image.title = "DMA"
LABEL org.opencontainers.image.licenses = "MPL-2.0"
LABEL org.opencontainers.image.vendor = "alexzedim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/alexzedim/cmnw"
LABEL org.opencontainers.image.description = "Intelligence always wins"

WORKDIR /usr/src/app

COPY ../package.json ./


RUN corepack pnpm install

COPY .. .

RUN npm install -g @nestjs/cli
RUN corepack enable

RUN nest build market \
  && nest build items \
  && nest build dma

CMD ["node"]



