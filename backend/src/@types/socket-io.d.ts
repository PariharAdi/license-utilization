declare module 'socket.io' {
    export class Server {
        constructor(server?: any, opts?: any);
        on(event: string, cb: (...args: any[]) => void): void;
        emit(event: string, ...args: any[]): void;
        use(middleware: (...args: any[]) => void): void;
        to(room: string): any;
        close(): void;
    }
}
