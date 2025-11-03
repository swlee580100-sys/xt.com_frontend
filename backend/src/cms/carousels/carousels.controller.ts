import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { CarouselsService } from './carousels.service';
import { CreateCarouselItemDto } from './dto/create-carousel-item.dto';
import { UpdateCarouselItemDto } from './dto/update-carousel-item.dto';
import { CarouselItemResponseDto } from './dto/carousel-item-response.dto';

@Controller('admin/cms/carousels')
export class CarouselsController {
  constructor(private readonly carouselsService: CarouselsService) {}

  @Get()
  @Roles('admin')
  async findAll(): Promise<CarouselItemResponseDto[]> {
    return this.carouselsService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id') id: string): Promise<CarouselItemResponseDto> {
    return this.carouselsService.findOne(id);
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateCarouselItemDto): Promise<CarouselItemResponseDto> {
    return this.carouselsService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCarouselItemDto
  ): Promise<CarouselItemResponseDto> {
    return this.carouselsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.carouselsService.remove(id);
    return { message: '公告轮播已删除' };
  }
}
