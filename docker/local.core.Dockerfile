FROM node:22.15-alpine

ARG OCI_CREATED
ARG OCI_REVISION
ARG OCI_VERSION

LABEL org.opencontainers.image.title="CMNW Core" \
    org.opencontainers.image.description="CORE - Intelligence always wins" \
    org.opencontainers.image.vendor="alexzedim" \
    org.opencontainers.image.url="https://cmnw.me" \
    org.opencontainers.image.source="https://github.com/alexzedim/cmnw" \
    org.opencontainers.image.documentation="https://github.com/alexzedim/cmnw#readme" \
    org.opencontainers.image.licenses="MPL-2.0" \
    org.opencontainers.image.logo="https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png" \
    org.opencontainers.image.base.name="node:22.15-alpine" \
    org.opencontainers.image.created="${OCI_CREATED}" \
    org.opencontainers.image.revision="${OCI_REVISION}" \
    org.opencontainers.image.version="${OCI_VERSION}"

WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli
RUN corepack enable

COPY ../package.json ./
RUN corepack pnpm install

COPY .. .

RUN nest build core

CMD ["node", "dist/apps/core/main.js"]


