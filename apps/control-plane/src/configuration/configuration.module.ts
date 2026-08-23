import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigurationItem } from '../entities/configuration-item.entity';
import { PlatformConfigurationService } from './platform-configuration.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConfigurationItem])],
  providers: [PlatformConfigurationService],
  exports: [PlatformConfigurationService, TypeOrmModule],
})
export class ConfigurationModule {}
