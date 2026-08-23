import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';
import { User } from './entities/user.entity';

export const SEEDED_USERS = [
  { id: '2b8a1f02-0fbb-4ccf-9b88-0f4d4ed1a101', name: 'Alex Chen', email: 'alex@example.test', coderUsername: 'alex' },
  { id: '2b8a1f02-0fbb-4ccf-9b88-0f4d4ed1a102', name: 'Jamie Lee', email: 'jamie@example.test', coderUsername: 'jamie' },
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
  ) {}

  async onModuleInit() {
    for (const seed of SEEDED_USERS) {
      const existing = await this.userRepository.findOneBy({ id: seed.id });
      if (existing) {
        if (!existing.coderUsername) await this.userRepository.save({ ...existing, coderUsername: seed.coderUsername });
      } else await this.userRepository.save(this.userRepository.create(seed));
    }
    const existingTemplate = await this.templateRepository.findOneBy({ id: GOLDEN_TEMPLATE.id });
    if (existingTemplate) {
      await this.templateRepository.save({ ...existingTemplate, ...GOLDEN_TEMPLATE });
    } else await this.templateRepository.save(this.templateRepository.create(GOLDEN_TEMPLATE));
  }
}
