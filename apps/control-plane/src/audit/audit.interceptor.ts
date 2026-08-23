import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, concatMap, from, map, Observable, of, switchMap, throwError } from 'rxjs';
import { AuditActorType, AuditOutcome } from '../entities/audit-log.entity';
import { UserRole } from '../entities/user.entity';
import { AUDIT_EVENT, AuditMetadata } from './audit.decorator';
import { AuditService } from './audit.service';

type RequestWithActor = {
  method: string;
  url: string;
  params: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  user?: { sub?: string; role?: UserRole };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(AUDIT_EVENT, [context.getHandler(), context.getClass()]);
    if (!metadata) return next.handle();
    const request = context.switchToHttp().getRequest<RequestWithActor>();
    const baseAction = metadata.action.replace(/_REQUESTED$/, '');
    return from(this.write(request, { ...metadata, action: `${baseAction}_REQUESTED` }, AuditOutcome.Success, undefined, undefined, 'requested')).pipe(
      switchMap(() => next.handle().pipe(
        concatMap((response) => from(this.writeCompletion(request, { ...metadata, action: `${baseAction}_COMPLETED` }, AuditOutcome.Success, response)).pipe(map(() => response))),
        catchError((error: unknown) => from(this.writeCompletion(request, { ...metadata, action: `${baseAction}_FAILED` }, AuditOutcome.Failure, undefined, error instanceof Error ? error.message : 'Unknown request failure')).pipe(
          catchError(() => of(null)),
          switchMap(() => throwError(() => error)),
        )),
      )),
    );
  }

  private writeCompletion(request: RequestWithActor, metadata: AuditMetadata, outcome: AuditOutcome, response?: unknown, errorMessage?: string): Promise<unknown> {
    return this.buildAndRecord(request, metadata, outcome, response, errorMessage, 'completed', true);
  }

  private write(request: RequestWithActor, metadata: AuditMetadata, outcome: AuditOutcome, response?: unknown, errorMessage?: string, phase?: 'requested' | 'completed'): Promise<unknown> {
    return this.buildAndRecord(request, metadata, outcome, response, errorMessage, phase, false);
  }

  private buildAndRecord(request: RequestWithActor, metadata: AuditMetadata, outcome: AuditOutcome, response: unknown, errorMessage: string | undefined, phase: 'requested' | 'completed' | undefined, completion: boolean): Promise<unknown> {
    const result = response as { id?: string; projectId?: string } | undefined;
    const resourceId = request.params.id || request.params.projectId || request.params.key || result?.id || null;
    const projectId = metadata.resourceType === 'Project'
      ? request.params.projectId || request.params.id || result?.projectId || result?.id || null
      : result?.projectId || null;
    const event = {
      actorUserId: request.user?.sub || null,
      actorType: AuditActorType.User,
      actorRole: request.user?.role || null,
      action: metadata.action,
      resourceType: metadata.resourceType,
      resourceId,
      projectId,
      outcome,
      requestId: request.headers['x-request-id'] || null,
      metadata: { method: request.method, path: request.url, ...(phase ? { phase } : {}), ...(errorMessage ? { error: errorMessage } : {}) },
    };
    return completion ? this.auditService.recordCompletion(event) : this.auditService.record(event);
  }
}
