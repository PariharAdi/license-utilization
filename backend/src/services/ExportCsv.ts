import { Response } from 'express';
import { Readable } from 'stream';
import { User } from '../types';

class ExportCsv {
    /**
     * Generate CSV text from user array. Fields are quoted and quotes are escaped.
     */
    generate(users: User[]): string {
        const headers = [
            'ID', 'Name', 'Username', 'Email', 'Status', 'License', 'Profile', 'Role', 'Last Login', 'Login Count', 'Objects Accessed'
        ];

        const escape = (value: unknown) => {
            if (value === null || value === undefined) return '';
            const str = String(value as unknown);
            // Double quotes inside value
            const escaped = str.replace(/"/g, '""');
            return `"${escaped}"`;
        };

        const rows = users.map(u => [
            u.id,
            u.name,
            u.username,
            u.email,
            u.status,
            u.license,
            u.profile,
            u.role,
            u.lastLogin,
            u.loginCount,
            u.objectsAccessed
        ].map(escape).join(','));

        return headers.join(',') + '\n' + rows.join('\n');
    }

    /**
     * Stream CSV to the express response. Uses a Readable stream so large payloads won't allocate twice.
     */
    sendToResponse(res: Response, users: User[], filename = 'salesforce_users.csv') {
        const csv = this.generate(users);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        const stream = Readable.from([csv]);
        stream.pipe(res);
    }
}

export default new ExportCsv();