import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';


export type Env = {
    JWT_SECRET: string;
    [key: string]: unknown; // Allow other bindings like DB
};

export type AuthVariables = {
    user: {
        id: number;
        company_id: number;
        email: string;
    };
};

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(
    async (c, next) => {
        const authHeader = c.req.header('Authorization');
        if (!authHeader) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        try {
            console.log('Verifying token:', token.substring(0, 10) + '...');
            console.log('Secret available:', !!c.env.JWT_SECRET);

            // Assuming the JWT payload contains id, company_id, email
            const payload = await verify(token, c.env.JWT_SECRET, 'HS256');

            c.set('user', {
                id: payload.id as number,
                company_id: payload.company_id as number,
                email: payload.email as string,
            });

            await next();
        } catch (e) {
            console.error('JWT Verification Error:', e);
            return c.json({ error: 'Invalid Token', details: e instanceof Error ? e.message : String(e) }, 401);
        }
    }
);
