import { IsUUID } from 'class-validator';
import { CreateProjectDto } from '../../projects/dto/create-project.dto';

export class AdminCreateProjectDto extends CreateProjectDto {
  @IsUUID()
  ownerId!: string;
}
