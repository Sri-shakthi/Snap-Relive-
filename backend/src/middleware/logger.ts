import morgan from 'morgan';

morgan.token('request-id', (req) => (req as { requestId?: string }).requestId ?? 'n/a');

export const loggerMiddleware = morgan(':method :url :status :response-time ms reqId=:request-id');
