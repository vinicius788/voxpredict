import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Middleware de validação Zod reutilizável.
 * Substitui os dados do request pela versão validada e tipada.
 * Retorna 400 com detalhes dos erros se a validação falhar.
 */
export function validate<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body',
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const fieldErrors = (result.error as ZodError).flatten().fieldErrors;
      const firstMessage = Object.values(fieldErrors).flat()[0];
      return res.status(400).json({
        success: false,
        error: firstMessage || 'Dados inválidos',
        details: fieldErrors,
      });
    }

    // Replace with parsed/coerced/defaulted data
    (req as unknown as Record<ValidationTarget, unknown>)[target] = result.data;
    return next();
  };
}
