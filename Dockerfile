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
RUN apk add --no-cache ca-certificates openssl && addgroup -S pricehunter && adduser -S pricehunter -G pricehunter

# platform-api2.max.ru uses the Russian Trusted Root CA chain. Keep the
# additional root explicit instead of disabling TLS verification.
COPY russian_trusted_root_ca.crt /usr/local/share/ca-certificates/russian_trusted_root_ca.crt
RUN update-ca-certificates

ENV NODE_ENV=production
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/russian_trusted_root_ca.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

COPY --from=build --chown=pricehunter:pricehunter /app/package.json ./package.json
COPY --from=build --chown=pricehunter:pricehunter /app/node_modules ./node_modules
COPY --from=build --chown=pricehunter:pricehunter /app/dist ./dist
COPY --from=build --chown=pricehunter:pricehunter /app/prisma ./prisma

USER pricehunter
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1

CMD ["sh", "-c", "npm run db:deploy && npm start"]
