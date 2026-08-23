import { IsString, MaxLength } from 'class-validator';

export class UpdateConfigurationDto {
  @IsString()
  @MaxLength(500)
  value!: string;
}
