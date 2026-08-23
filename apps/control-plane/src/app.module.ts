import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { Project } from './entities/project.entity';
import { Template } from './entities/template.entity';
import { User } from './entities/user.entity';
import { HealthController } from './health.controller';
import { RequestIdMiddleware } from './request-id.middleware';
import { ProjectsModule } from './projects/projects.module';
import { SeedService } from './seed.service';
import { WorkspaceModule } from './workspace/workspace.module';
import { PreviewModule } from './preview/preview.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgres://vibe:vibe@localhost:5432/vibe_platform',
      entities: [User, Template, Project],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([User, Template]),
    AuthModule,
    WorkspaceModule,
    ProjectsModule,
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
