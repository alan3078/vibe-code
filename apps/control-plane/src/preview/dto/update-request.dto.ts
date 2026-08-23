import { IsIn } from 'class-validator';

export class UpdateRequestDto {
  @IsIn(['Open', 'In Progress', 'Done'])
  status!: 'Open' | 'In Progress' | 'Done';
}
