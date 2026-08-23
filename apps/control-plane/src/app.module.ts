import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { Project } from './entities/project.entity';
import { Template } from './entities/template.entity';
import { User } from './entities/user.entity';
import { ConfigurationGroup } from './entities/configuration-group.entity';
import { ConfigurationItem } from './entities/configuration-item.entity';
import { AuditLog } from './entities/audit-log.entity';
import { HealthController } from './health.controller';
import { RequestIdMiddleware } from './request-id.middleware';
import { ProjectsModule } from './projects/projects.module';
import { SeedService } from './seed.service';
import { WorkspaceModule } from './workspace/workspace.module';
import { PreviewModule } from './preview/preview.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { AuditModule } from './audit/audit.module';
import { WorkspaceGovernanceModule } from './workspace/workspace-governance.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgres://vibe:vibe@localhost:5432/vibe_platform',
      entities: [User, Template, Project, ConfigurationGroup, ConfigurationItem, AuditLog],
      synchronize: process.env.NODE_ENV !== 'production',
      migrations: [__dirname + '/migrations/*{.js,.ts}'],
      migrationsRun: process.env.RUN_MIGRATIONS === 'true',
    }),
    TypeOrmModule.forFeature([User, Template, ConfigurationGroup, ConfigurationItem]),
    AuthModule,
    ConfigurationModule,
    AuditModule,
    WorkspaceModule,
    WorkspaceGovernanceModule,
    ProjectsModule,
    AdminModule,
    PreviewModule,
  ],
  controllers: [HealthController],
  providers: [SeedService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
