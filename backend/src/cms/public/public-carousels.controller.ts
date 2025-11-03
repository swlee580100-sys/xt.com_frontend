import { Controller, Get } from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator';
import { CarouselsService } from '../carousels/carousels.service';
import { CarouselItemResponseDto } from '../carousels/dto/carousel-item-response.dto';

@Controller('public/cms/carousels')
export class PublicCarouselsController {
  constructor(private readonly carouselsService: CarouselsService) {}

  @Get()
  @Public()
  async findAll(): Promise<CarouselItemResponseDto[]> {
    return this.carouselsService.findAll();
  }
}
