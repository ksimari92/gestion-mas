/**
 * SCRIPT DE SEED DE DEMOSTRACIÓN (ENtorno de Prueba)
 * 
 * Uso:
 *   SEED_SECRET=... npx tsx scripts/seed-demo.ts
 */

import * as bcrypt from 'bcryptjs';

const COMPANY_NAME = 'Empresa Test';

const USERS = [
    {
        name: 'Usuario Test',
        email: 'test@gmail.com',
        password: 'test123456',
    }
];

async function main() {
    console.log('🚀 Iniciando seed de demostración...\n');

    if (!process.env.SEED_SECRET) {
        console.error('❌ Falta la variable de entorno: SEED_SECRET');
        process.exit(1);
    }

    // Hashear contraseñas
    const hashedUsers = await Promise.all(
        USERS.map(async (u) => {
            const hash = await bcrypt.hash(u.password, 12);
            return { name: u.name, email: u.email, password_hash: hash };
        })
    );

    const payload = {
        secret: process.env.SEED_SECRET,
        company_name: COMPANY_NAME,
        users: hashedUsers,
    };

    const API_URL = process.env.API_URL || 'https://gestion-back.simarikaren.workers.dev';
    console.log(`📡 Conectando a: ${API_URL}\n`);

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

    console.log('✅ Seed de demo completado exitosamente!\n');
    console.log('📋 Credenciales de Acceso:');
    console.log(`   Empresa: ${result.company}`);
    console.log(`   Email: test@gmail.com`);
    console.log(`   Password: test123456`);
}

main().catch(err => {
    console.error('Error inesperado:', err);
    process.exit(1);
});
