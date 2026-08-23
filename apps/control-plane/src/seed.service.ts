import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';
import { User, UserRole } from './entities/user.entity';
import { ConfigurationGroup } from './entities/configuration-group.entity';
import { ConfigurationItem, ConfigurationValueType } from './entities/configuration-item.entity';

export const SEEDED_USERS = [
  { id: '2b8a1f02-0fbb-4ccf-9b88-0f4d4ed1a101', name: 'Alex Chen', email: 'alex@example.test', coderUsername: 'alex', role: UserRole.Member },
  { id: '2b8a1f02-0fbb-4ccf-9b88-0f4d4ed1a102', name: 'Jamie Lee', email: 'jamie@example.test', coderUsername: 'jamie', role: UserRole.Member },
  { id: '2b8a1f02-0fbb-4ccf-9b88-0f4d4ed1a103', name: 'Avery Morgan', email: 'avery.admin@example.test', coderUsername: 'avery-admin', role: UserRole.Administrator },
];

const GOVERNANCE_CONFIGURATION = [
  { key: 'workspace.max_active_per_user', displayName: 'Maximum active workspaces per member', description: 'Creating, starting, running, and stopping workspaces consume this slot.', valueType: ConfigurationValueType.Number, value: '1', minimum: 1, maximum: 10 },
  { key: 'workspace.idle_timeout_minutes', displayName: 'Workspace idle timeout (minutes)', description: 'Stop a running workspace after this much unobserved portal, preview, or IDE-open activity.', valueType: ConfigurationValueType.Number, value: '30', minimum: 1, maximum: 1440 },
  { key: 'workspace.reaper_interval_seconds', displayName: 'Workspace policy reconciliation interval (seconds)', description: 'How often the control plane evaluates idle workspaces and policy drift.', valueType: ConfigurationValueType.Number, value: '30', minimum: 10, maximum: 3600 },
];

export const GOLDEN_TEMPLATE = {
  id: 'golden-react-nest-postgres',
  name: 'React + Vite / Python + FastAPI',
  version: '1.0.0',
  isActive: true,
};

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Template) private readonly templateRepository: Repository<Template>,
    @InjectRepository(ConfigurationGroup) private readonly configurationGroupRepository: Repository<ConfigurationGroup>,
    @InjectRepository(ConfigurationItem) private readonly configurationItemRepository: Repository<ConfigurationItem>,
  ) {}

  async onModuleInit() {
    for (const seed of SEEDED_USERS) {
      const existing = await this.userRepository.findOneBy({ id: seed.id });
      if (existing) {
        if (!existing.coderUsername || existing.role !== seed.role) await this.userRepository.save({ ...existing, coderUsername: seed.coderUsername, role: seed.role });
      } else await this.userRepository.save(this.userRepository.create(seed));
    }
    const existingTemplate = await this.templateRepository.findOneBy({ id: GOLDEN_TEMPLATE.id });
    if (existingTemplate) {
      await this.templateRepository.save({ ...existingTemplate, ...GOLDEN_TEMPLATE });
    } else await this.templateRepository.save(this.templateRepository.create(GOLDEN_TEMPLATE));
    let workspaceGroup = await this.configurationGroupRepository.findOne({ where: { key: 'workspace' } });
    if (!workspaceGroup) {
      workspaceGroup = await this.configurationGroupRepository.save(this.configurationGroupRepository.create({
        key: 'workspace', name: 'Workspace governance', description: 'Policies that control workspace capacity and automatic shutdown.', isActive: true,
      }));
    }
    for (const config of GOVERNANCE_CONFIGURATION) {
      const existing = await this.configurationItemRepository.findOne({ where: { key: config.key } });
      if (!existing) await this.configurationItemRepository.save(this.configurationItemRepository.create({ ...config, group: workspaceGroup, isSensitive: false, isMutable: true }));
    }
  }
}
