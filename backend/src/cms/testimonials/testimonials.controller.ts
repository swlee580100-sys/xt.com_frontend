import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { TestimonialResponseDto } from './dto/testimonial-response.dto';

@Controller('admin/cms/testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get()
  @Roles('admin')
  async findAll(): Promise<TestimonialResponseDto[]> {
    return this.testimonialsService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id') id: string): Promise<TestimonialResponseDto> {
    return this.testimonialsService.findOne(id);
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateTestimonialDto): Promise<TestimonialResponseDto> {
    return this.testimonialsService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTestimonialDto
  ): Promise<TestimonialResponseDto> {
    return this.testimonialsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.testimonialsService.remove(id);
    return { message: '用户见证已删除' };
  }
}
