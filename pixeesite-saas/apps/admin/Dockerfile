# Pixeesite admin
FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat bash
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# Force install of all deps (incl. devDependencies) by setting prod=false
ENV NODE_ENV=
COPY . .
RUN pnpm install --no-frozen-lockfile --prod=false
RUN cd packages/database && pnpm exec prisma generate --schema prisma/platform.prisma && pnpm exec prisma generate --schema prisma/tenant.prisma
RUN pnpm --filter @pixeesite/admin build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "cd /app/packages/database && pnpm exec prisma db push --schema prisma/platform.prisma --skip-generate --accept-data-loss && bash /app/apps/admin/scripts/migrate-all-tenants.sh && cd /app && pnpm --filter @pixeesite/admin start"]
