import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { TestimonialResponseDto } from './dto/testimonial-response.dto';

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TestimonialResponseDto[]> {
    const testimonials = await this.prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return testimonials.map(testimonial => new TestimonialResponseDto(testimonial));
  }

  async findOne(id: string): Promise<TestimonialResponseDto> {
    const testimonial = await this.prisma.testimonial.findUnique({
      where: { id }
    });

    if (!testimonial) {
      throw new NotFoundException(`用户见证 ${id} 不存在`);
    }

    return new TestimonialResponseDto(testimonial);
  }

  async create(dto: CreateTestimonialDto): Promise<TestimonialResponseDto> {
    const testimonial = await this.prisma.testimonial.create({
      data: dto
    });
    return new TestimonialResponseDto(testimonial);
  }

  async update(id: string, dto: UpdateTestimonialDto): Promise<TestimonialResponseDto> {
    try {
      const testimonial = await this.prisma.testimonial.update({
        where: { id },
        data: dto
      });
      return new TestimonialResponseDto(testimonial);
    } catch (error) {
      this.handleNotFound(error, id);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.testimonial.delete({
        where: { id }
      });
    } catch (error) {
      this.handleNotFound(error, id);
    }
  }

  private handleNotFound(error: unknown, id: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(`用户见证 ${id} 不存在`);
    }
    throw error;
  }
}
