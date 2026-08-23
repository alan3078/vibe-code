import { validate } from 'class-validator';
import { CreateRequestDto } from './create-request.dto';

describe('CreateRequestDto', () => {
  it('rejects a whitespace-only request title', async () => {
    const dto = Object.assign(new CreateRequestDto(), { title: '   ' });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'title')).toBe(true);
  });
});
