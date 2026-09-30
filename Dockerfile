FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/
COPY skills/ ./skills/
COPY docs/ ./docs/

ENV NODE_ENV=production
ENTRYPOINT ["node", "dist/index.js"]
CMD ["--help"]
