FROM node:lts-alpine AS development

RUN corepack enable

WORKDIR /usr/src/app

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack pnpm add glob rimraf webpack

RUN corepack pnpm install --dev

COPY . .

RUN corepack pnpm run build

FROM node:lts-alpine as production

RUN corepack enable

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack pnpm install --prod

COPY . .

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/apps/characters/main.js"]





