FROM arm64v8/node:lts


# Set image labels #
LABEL org.opencontainers.image.title = "Market"
LABEL org.opencontainers.image.vendor = "alexzedim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/alexzedim/cmnw"
LABEL org.opencontainers.image.licenses = "MPL-2.0"
LABEL org.opencontainers.image.description = "CMNW"

WORKDIR /usr/src/app

# Clone config from private github repo #
RUN git clone https://github.com/AlexZeDim/cmnw-secrets.git
RUN mv cmnw-secrets/* .
RUN rm -rf cmnw-secrets

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Installing private github packages #
RUN echo @alexzedim:registry=https://npm.pkg.github.com/ >> ~/.npmrc

RUN corepack pnpm install

COPY . .

RUN npm install -g @nestjs/cli
RUN corepack enable
RUN nest build market

CMD ["node", "dist/apps/market/main.js"]





