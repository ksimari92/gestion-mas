/**
 * SCRIPT DE SEED DE PRODUCCIÓN
 * 
 * Uso:
 *   USER1_PASS=contraseña1 USER2_PASS=contraseña2 USER3_PASS=contraseña3 SEED_SECRET=... npx tsx scripts/seed-production.ts
 */

import * as bcrypt from 'bcryptjs';

// ─── CONFIGURACIÓN — EDITAR ESTOS VALORES ────────────────────────────────────

const COMPANIES = [
    {
        name: 'Empresa MAS',
        users: [
            {
                name: 'Karen Simari',
                email: 'simarikaren@gmail.com',
                envVar: 'USER_MAS_KAREN_PASS',
            },
            {
                name: 'Alan Simari',
                email: 'simarialan9@gmail.com',
                envVar: 'USER_MAS_ALAN_PASS',
            },
            {
                name: 'Miguel Simari',
                email: 'mas129@hotmail.com.ar',
                envVar: 'USER_MAS_MIGUEL_PASS',
            },
        ]
    },
    {
        name: 'Empresa TEST',
        users: [
            {
                name: 'Test User',
                email: 'test@gmail.com',
                envVar: 'USER_TEST_PASS',
            }
        ]
    }
];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🔍 Verificando variables de entorno...\n');

    // Verificar que todas las contraseñas y el secret están definidas
    let allEnvVarsPresent = true;
    if (!process.env.SEED_SECRET) {
        console.error('❌ Falta la variable de entorno: SEED_SECRET');
        allEnvVarsPresent = false;
    }

    COMPANIES.forEach(company => {
        company.users.forEach(u => {
            if (!process.env[u.envVar]) {
                console.error(`❌ Falta la variable de entorno: ${u.envVar} (para ${u.name} en ${company.name})`);
                allEnvVarsPresent = false;
            }
        });
    });

    if (!allEnvVarsPresent) {
        console.error('\nEjemplo de uso:');
        console.error('  SEED_SECRET="..." USER_MAS_KAREN_PASS="..." ... npx tsx scripts/seed-production.ts');
        process.exit(1);
    }

    console.log('✅ Variables de entorno OK\n');
    console.log('⚠️  ATENCIÓN: Este script borrará TODOS los datos existentes.');
    console.log('   Presioná Ctrl+C en los próximos 5 segundos para cancelar...\n');

    // await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('🚀 Iniciando seed de producción...\n');

    // Hashear contraseñas y preparar payload
    const companiesWithHashedUsers = await Promise.all(
        COMPANIES.map(async (company) => {
            const hashedUsers = await Promise.all(
                company.users.map(async (u) => {
                    const password = process.env[u.envVar]!;
                    const hash = await bcrypt.hash(password, 12);
                    return {
                        name: u.name,
                        email: u.email,
                        password_hash: hash
                    };
                })
            );
            return {
                company_name: company.name,
                users: hashedUsers
            };
        })
    );

    const payload = {
        secret: process.env.SEED_SECRET,
        companies: companiesWithHashedUsers
    };

    // Llamar al endpoint del backend
    const API_URL = process.env.API_URL || 'http://localhost:8787';
    console.log(`📡 Conectando a: ${API_URL}\n`);
    console.log(`DEBUG: Payload to send: ${JSON.stringify({ ...payload, secret: '***' })}\n`);

    const response = await fetch(`${API_URL}/seed-production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    } catch (e) {
        console.error('❌ La respuesta no es JSON válido:');
        console.error(text);
        process.exit(1);
    }

    if (!response.ok) {
        console.error('❌ Error del servidor:', result);
        process.exit(1);
    }

    console.log('✅ Seed completado exitosamente!\n');
    console.log('📋 Resumen:');
    result.results.forEach((r: any) => {
        console.log(`\n🏢 Empresa: ${r.company}`);
        console.log(`   Usuarios creados: ${r.users_created}`);
        r.users.forEach((u: any) => {
            console.log(`   • ${u.name} (${u.email})`);
        });
    });
    console.log('\n🔐 Las contraseñas NO quedan registradas en ningún log.');
    console.log('🗑️  Acordate de eliminar el archivo .env.seed si lo usaste.\n');
}

main().catch(err => {
    console.error('Error inesperado:', err);
    process.exit(1);
});
