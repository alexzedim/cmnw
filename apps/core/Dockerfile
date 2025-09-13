FROM node:lts-alpine


LABEL org.opencontainers.image.title = "Keys"
LABEL org.opencontainers.image.vendor = "alexzedim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/AlexZeDim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/AlexZeDim/cmnw"
LABEL org.opencontainers.image.licenses = "MPL-2.0"
LABEL org.opencontainers.image.description = "CMNW"

WORKDIR /usr/src/app

RUN apk add --no-cache git
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN npm install -g @nestjs/cli
RUN corepack enable
RUN corepack pnpm install

COPY . .

RUN nest build keys

CMD ["node", "dist/apps/keys/main.js"]




