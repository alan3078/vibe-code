import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigurationItem, ConfigurationValueType } from '../entities/configuration-item.entity';

@Injectable()
export class PlatformConfigurationService {
  constructor(@InjectRepository(ConfigurationItem) private readonly configurationRepository: Repository<ConfigurationItem>) {}

  async getPositiveInteger(key: string): Promise<number> {
    const item = await this.configurationRepository.createQueryBuilder('item').addSelect('item.value').where('item.key = :key', { key }).getOne();
    if (!item) throw new NotFoundException(`Configuration item ${key} is not available`);
    if (item.valueType !== ConfigurationValueType.Number || !/^\d+$/.test(item.value) || Number(item.value) < 1) {
      throw new BadRequestException(`Configuration item ${key} must be a positive integer`);
    }
    const value = Number(item.value);
    if (!Number.isSafeInteger(value) || (item.minimum !== null && value < item.minimum) || (item.maximum !== null && value > item.maximum)) {
      throw new BadRequestException(`Configuration item ${key} must be a positive integer within its allowed range`);
    }
    return value;
  }
}
