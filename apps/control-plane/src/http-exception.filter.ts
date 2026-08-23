import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof HttpException)) {
      console.error('Unhandled request error', exception);
    }
    const response = host.switchToHttp().getResponse<{ status?: (code: number) => { send: (body: unknown) => void }; code?: (code: number) => { send: (body: unknown) => void } }>();
    const request = host.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const message = typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as { message?: unknown }).message || exceptionResponse;
    const reply = response.code || response.status;
    if (reply) {
      reply.call(response, status).send({ statusCode: status, message, requestId: request.headers['x-request-id'] });
    }
  }
}
