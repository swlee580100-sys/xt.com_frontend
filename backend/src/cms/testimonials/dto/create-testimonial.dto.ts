import { IsInt, IsString, Max, Min } from 'class-validator';

export class CreateTestimonialDto {
  @IsString()
  name!: string;

  @IsString()
  title!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  content!: string;
}
