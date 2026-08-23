import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfigurationCmsQueryDto } from './cms-query.dto';

describe('CMS query validation', () => {
  it('rejects malformed boolean filters instead of treating them as false', async () => {
    const dto = plainToInstance(ConfigurationCmsQueryDto, { isActive: 'invalid', page: '1', pageSize: '20' });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'isActive')).toBe(true);
  });

  it('transforms explicit false filters and rejects excessive page offsets', async () => {
    const valid = plainToInstance(ConfigurationCmsQueryDto, { isMutable: 'false', page: '2', pageSize: '20' });
    const excessive = plainToInstance(ConfigurationCmsQueryDto, { page: '100001', pageSize: '20' });

    expect(await validate(valid)).toEqual([]);
    expect(valid.isMutable).toBe(false);
    expect((await validate(excessive)).some((error) => error.property === 'page')).toBe(true);
  });
});
