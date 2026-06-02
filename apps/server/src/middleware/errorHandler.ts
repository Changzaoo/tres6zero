import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[error]', err.message);
  if ((err as any).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: 'Arquivo maior que o limite permitido.',
      code: 'LIMIT_FILE_SIZE',
    });
    return;
  }

  const status = (err as any).status || 500;
  res.status(status).json({
    error: err.message || 'Erro interno do servidor',
    code: (err as any).code || err.message,
  });
}
