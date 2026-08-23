import { validate } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  it('rejects a whitespace-only project name', async () => {
    const dto = Object.assign(new CreateProjectDto(), { name: '  ' });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'name')).toBe(true);
  });
});
