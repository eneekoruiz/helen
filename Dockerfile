FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/
COPY skills/ ./skills/
COPY docs/ ./docs/
COPY templates/ ./templates/
COPY evals/ ./evals/
COPY scripts/ ./scripts/

ENV NODE_ENV=production
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]
