#!/usr/bin/env node
/**
 * pixeesite CLI — operations sur les tenants + templates.
 *
 * Usage:
 *   pixeesite tenant:create --slug arnaud-photo --owner arnaud@example.com --plan pro
 *   pixeesite tenant:list
 *   pixeesite tenant:migrate --slug arnaud-photo
 *   pixeesite tenant:drop --slug arnaud-photo --confirm
 *   pixeesite templates:seed
 */
import { Command } from 'commander';
import { platformDb, provisionTenantDb, dropTenantDb, getTenantPrisma } from '@pixeesite/database';
import { TEMPLATE_SEEDS } from './templates';

const program = new Command();
program
  .name('pixeesite')
  .description('Pixeesite CLI — operations multi-tenant')
  .version('0.1.0');

program
  .command('tenant:create')
  .description('Create a new tenant with provisioned DB')
  .requiredOption('--slug <slug>', 'Org slug (a-z, 0-9, dash)')
  .requiredOption('--owner <email>', 'Owner email')
  .option('--name <name>', 'Org display name')
  .option('--plan <plan>', 'Plan (free/solo/pro/agency)', 'free')
  .action(async (opts) => {
    const slug = opts.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    console.log(`📦 Creating tenant "${slug}"...`);

    let user = await platformDb.user.findUnique({ where: { email: opts.owner } });
    if (!user) {
      user = await platformDb.user.create({
        data: { email: opts.owner, name: opts.owner.split('@')[0] },
      });
      console.log(`✓ Created user ${user.email}`);
    }

    const org = await platformDb.org.create({
      data: {
        slug,
        name: opts.name || slug,
        ownerId: user.id,
        plan: opts.plan,
        defaultDomain: `${slug}.pixeeplay.com`,
        members: { create: { userId: user.id, role: 'owner', acceptedAt: new Date() } },
      },
    });
    console.log(`✓ Created org ${org.slug}`);

    console.log(`📥 Provisioning tenant DB...`);
    const { dbName } = await provisionTenantDb(slug);
    console.log(`✓ DB ready : ${dbName}`);

    console.log(`\n🎉 Tenant "${slug}" ready !`);
    console.log(`   Default domain : https://${slug}.pixeeplay.com`);
    console.log(`   Admin URL      : https://app.pixeesite.com/orgs/${slug}`);
  });

program
  .command('tenant:list')
  .description('List all tenants')
  .action(async () => {
    const orgs = await platformDb.org.findMany({
      orderBy: { createdAt: 'desc' },
      select: { slug: true, name: true, plan: true, planStatus: true, tenantDbReady: true, createdAt: true },
    });
    console.table(orgs);
  });

program
  .command('tenant:migrate')
  .description('Re-apply tenant.prisma schema to a tenant DB')
  .requiredOption('--slug <slug>')
  .action(async (opts) => {
    console.log(`🔄 Migrating tenant DB for "${opts.slug}"...`);
    const { dbName } = await provisionTenantDb(opts.slug); // idempotent
    console.log(`✓ Migrated ${dbName}`);
  });

program
  .command('tenant:drop')
  .description('DROP a tenant DB and remove from platform (irreversible !)')
  .requiredOption('--slug <slug>')
  .option('--confirm', 'Required to actually drop')
  .action(async (opts) => {
    if (!opts.confirm) {
      console.error('⚠ Add --confirm to actually drop the tenant.');
      process.exit(1);
    }
    await dropTenantDb(opts.slug);
    await platformDb.org.delete({ where: { slug: opts.slug } }).catch(() => {});
    console.log(`✗ Dropped tenant "${opts.slug}"`);
  });

program
  .command('templates:seed')
  .description('Seed the marketplace with default templates')
  .action(async () => {
    console.log(`🌱 Seeding ${TEMPLATE_SEEDS.length} templates...`);
    let created = 0, skipped = 0;
    for (const t of TEMPLATE_SEEDS) {
      const existing = await platformDb.template.findUnique({ where: { slug: t.slug } });
      if (existing) { skipped++; continue; }
      await platformDb.template.create({ data: t });
      created++;
    }
    console.log(`✓ ${created} templates created, ${skipped} skipped (already exist)`);
  });

program.parseAsync(process.argv).catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
