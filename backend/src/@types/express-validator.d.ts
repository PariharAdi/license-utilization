declare module 'express-validator' {
    export function body(path: string, message?: string): any;
    export function validationResult(req: any): { isEmpty: () => boolean; array: () => any[] };
}
