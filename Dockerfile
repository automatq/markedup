FROM node:22-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package.json server/schema.prisma ./
RUN npm install

COPY server/index.ts ./
RUN npx prisma generate --schema schema.prisma

EXPOSE 1234
CMD ["npx", "tsx", "index.ts"]
