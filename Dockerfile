FROM node:22-alpine AS build

WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

RUN npm run db:generate && npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app
RUN apk add --no-cache openssl && addgroup -S pricehunter && adduser -S pricehunter -G pricehunter

ENV NODE_ENV=production

COPY --from=build --chown=pricehunter:pricehunter /app/package.json ./package.json
COPY --from=build --chown=pricehunter:pricehunter /app/node_modules ./node_modules
COPY --from=build --chown=pricehunter:pricehunter /app/dist ./dist
COPY --from=build --chown=pricehunter:pricehunter /app/prisma ./prisma

USER pricehunter
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1

CMD ["sh", "-c", "npm run db:deploy && npm start"]
