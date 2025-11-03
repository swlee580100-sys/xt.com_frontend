import { IsInt, IsString, Min } from 'class-validator';

export class CreateCarouselItemDto {
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsString()
  content!: string;
}
