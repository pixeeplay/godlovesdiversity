# Pixeesite render — Dockerfile single-stage
FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat bash
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# Force install of all deps (incl. devDependencies) by clearing NODE_ENV
ENV NODE_ENV=
COPY . .
RUN pnpm install --no-frozen-lockfile --prod=false
RUN cd packages/database && pnpm exec prisma generate --schema prisma/platform.prisma && pnpm exec prisma generate --schema prisma/tenant.prisma
RUN pnpm --filter @pixeesite/render build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["pnpm", "--filter", "@pixeesite/render", "start"]
