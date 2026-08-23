import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Length(2, 100)
  @Matches(/\S/, { message: 'name must contain a non-whitespace character' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
