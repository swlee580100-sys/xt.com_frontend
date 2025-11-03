import { PartialType } from '@nestjs/mapped-types';

import { CreateCarouselItemDto } from './create-carousel-item.dto';

export class UpdateCarouselItemDto extends PartialType(CreateCarouselItemDto) {}
