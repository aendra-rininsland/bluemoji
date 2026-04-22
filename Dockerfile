FROM node:25-slim
RUN apt-get update && apt-get install -y --no-install-recommends unzip ca-certificates curl xz-utils sqlite3 \
    && curl -fsSL https://github.com/duckdb/duckdb/releases/download/v1.2.1/duckdb_cli-linux-amd64.zip -o /tmp/duckdb.zip \
    && unzip /tmp/duckdb.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/duckdb \
    && rm /tmp/duckdb.zip \
    && apt-get purge -y unzip curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3
COPY . .
RUN npx vp build
RUN npm prune --omit=dev
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "--experimental-strip-types", "node_modules/@hatk/hatk/dist/main.js", "hatk.config.ts"]
