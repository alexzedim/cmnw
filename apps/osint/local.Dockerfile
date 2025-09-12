FROM node:lts-alpine AS development

WORKDIR /usr/src/app

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack pnpm add glob rimraf webpack

RUN corepack pnpm install --frozen-lockfile --dev

COPY . .

RUN corepack pnpm run build

FROM node:lts-alpine as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack pnpm install --frozen-lockfile --prod

COPY . .

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/apps/osint/main.js"]






