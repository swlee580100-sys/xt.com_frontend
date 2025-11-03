import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateCarouselItemDto } from './dto/create-carousel-item.dto';
import { UpdateCarouselItemDto } from './dto/update-carousel-item.dto';
import { CarouselItemResponseDto } from './dto/carousel-item-response.dto';

@Injectable()
export class CarouselsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CarouselItemResponseDto[]> {
    const items = await this.prisma.carouselItem.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    return items.map(item => new CarouselItemResponseDto(item));
  }

  async findOne(id: string): Promise<CarouselItemResponseDto> {
    const item = await this.prisma.carouselItem.findUnique({
      where: { id }
    });

    if (!item) {
      throw new NotFoundException(`公告轮播 ${id} 不存在`);
    }

    return new CarouselItemResponseDto(item);
  }

  async create(dto: CreateCarouselItemDto): Promise<CarouselItemResponseDto> {
    const item = await this.prisma.carouselItem.create({
      data: dto
    });
    return new CarouselItemResponseDto(item);
  }

  async update(id: string, dto: UpdateCarouselItemDto): Promise<CarouselItemResponseDto> {
    try {
      const item = await this.prisma.carouselItem.update({
        where: { id },
        data: dto
      });
      return new CarouselItemResponseDto(item);
    } catch (error) {
      this.handleNotFound(error, id);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.carouselItem.delete({
        where: { id }
      });
    } catch (error) {
      this.handleNotFound(error, id);
    }
  }

  private handleNotFound(error: unknown, id: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(`公告轮播 ${id} 不存在`);
    }
    throw error;
  }
}
