import { Pool } from 'pg';

declare global {
    namespace Express {
        interface Request {
            pool?: Pool;
            session?: any;
            user?: any;
            organization?: any;
        }
    }
}

export { };
