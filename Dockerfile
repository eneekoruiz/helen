# syntax=docker/dockerfile:1
# Build stage compiles TypeScript; the runtime image only carries production dependencies.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY templates ./templates
COPY skills ./skills
COPY docs ./docs
COPY evals ./evals
# Run as the unprivileged "node" user against the project mounted at /workspace:
#   docker run --rm -v "$PWD":/workspace helen setup
USER node
WORKDIR /workspace
ENTRYPOINT ["node", "/app/dist/cli.js"]
CMD ["--help"]
