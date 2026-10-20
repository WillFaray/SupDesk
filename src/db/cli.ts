import pool from '../database.js';
import { resetDatabase, runMigrations } from './migrator.js';
import { SEED_DEFAULT_PASSWORD, seedDatabase } from './seed.js';

const comando = process.argv[2];
const flags = new Set(process.argv.slice(3));

const executar = async (): Promise<void> => {
    try {
        switch (comando) {
            case 'migrate': {
                const res = await runMigrations(pool);
                console.log(
                    `[db:migrate] Aplicadas: ${res.applied.length} (${res.applied.join(', ') || 'nenhuma'}) | Já aplicadas: ${res.skipped.length}`,
                );
                break;
            }
            case 'seed': {
                await runMigrations(pool);
                const res = await seedDatabase(pool);
                console.log(
                    `[db:seed] Concluído: ${res.users} usuários sincronizados, ${res.tickets} chamados criados, ${res.comments} comentários criados (senha padrão: "${SEED_DEFAULT_PASSWORD}").`,
                );
                break;
            }
            case 'reset': {
                const mig = await resetDatabase(pool);
                console.log(
                    `[db:reset] Esquema recriado e ${mig.applied.length} migrações aplicadas.`,
                );
                if (flags.has('--seed')) {
                    const seed = await seedDatabase(pool);
                    console.log(
                        `[db:reset] Seed aplicado: ${seed.users} usuários, ${seed.tickets} chamados, ${seed.comments} comentários.`,
                    );
                }
                break;
            }
            default: {
                console.error('Uso: tsx src/db/cli.ts <migrate|seed|reset> [--seed]');
                process.exitCode = 1;
            }
        }
    } finally {
        await pool.end();
    }
};

void executar();
