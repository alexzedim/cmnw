FROM node:lts

LABEL org.opencontainers.image.title = "CORE"
LABEL org.opencontainers.image.licenses = "MPL-2.0"
LABEL org.opencontainers.image.vendor = "alexzedim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/alexzedim/cmnw"
LABEL org.opencontainers.image.description = "Intelligence always wins"

WORKDIR /usr/src/app

COPY ../package.json ./

# Installing private github packages #
RUN echo @alexzedim:registry=https://npm.pkg.github.com/ >> ~/.npmrc

RUN corepack pnpm install

COPY .. .

RUN npm install -g @nestjs/cli
RUN corepack enable

RUN nest build core

CMD ["node"]



