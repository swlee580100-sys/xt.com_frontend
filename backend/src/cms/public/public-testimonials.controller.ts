import { Controller, Get } from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator';
import { TestimonialsService } from '../testimonials/testimonials.service';
import { TestimonialResponseDto } from '../testimonials/dto/testimonial-response.dto';

@Controller('public/cms/testimonials')
export class PublicTestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get()
  @Public()
  async findAll(): Promise<TestimonialResponseDto[]> {
    return this.testimonialsService.findAll();
  }
}
