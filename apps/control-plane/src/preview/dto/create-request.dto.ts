import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @Length(1, 160)
  @Matches(/\S/, { message: 'title must contain a non-whitespace character' })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
