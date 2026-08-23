import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AuditActorType, AuditOutcome } from '../../entities/audit-log.entity';
import { ConfigurationValueType } from '../../entities/configuration-item.entity';
import { ProjectStatus } from '../../entities/project.entity';
import { UserRole } from '../../entities/user.entity';

export class CmsPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;
}

export class ProjectCmsQueryDto extends CmsPageQueryDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(200) owner?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsString() @MaxLength(120) workspaceId?: string;
  @IsOptional() @IsDateString() createdFrom?: string;
  @IsOptional() @IsDateString() createdTo?: string;
}

export class ConfigurationCmsQueryDto extends CmsPageQueryDto {
  @IsOptional() @IsString() @MaxLength(160) group?: string;
  @IsOptional() @IsString() @MaxLength(160) key?: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsEnum(ConfigurationValueType) valueType?: ConfigurationValueType;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true' ? true : value === false || value === 'false' ? false : value) @IsBoolean() isMutable?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true' ? true : value === false || value === 'false' ? false : value) @IsBoolean() isActive?: boolean;
}

export class UserCmsQueryDto extends CmsPageQueryDto {
  @IsOptional() @IsString() @MaxLength(200) identity?: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(200) email?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsString() @MaxLength(120) coderUsername?: string;
  @IsOptional() @IsDateString() createdFrom?: string;
  @IsOptional() @IsDateString() createdTo?: string;
}

export class AuditCmsQueryDto extends CmsPageQueryDto {
  @IsOptional() @IsString() @MaxLength(200) user?: string;
  @IsOptional() @IsString() @MaxLength(120) action?: string;
  @IsOptional() @IsString() @MaxLength(160) resource?: string;
  @IsOptional() @IsEnum(AuditActorType) actorType?: AuditActorType;
  @IsOptional() @IsEnum(UserRole) userRole?: UserRole;
  @IsOptional() @IsEnum(AuditOutcome) outcome?: AuditOutcome;
  @IsOptional() @IsString() @MaxLength(120) requestId?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}
