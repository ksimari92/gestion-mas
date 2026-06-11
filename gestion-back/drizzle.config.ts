import type { Config } from 'drizzle-kit';

export default {
    schema: './schema.ts',
    out: './drizzle',
    driver: 'd1',
    dbCredentials: {
        wranglerConfigPath: 'wrangler.toml',
        dbName: 'gestion-db',
    },
} satisfies Config;
