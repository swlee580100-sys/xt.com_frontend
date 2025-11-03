import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { CarouselsController } from './carousels.controller';
import { CarouselsService } from './carousels.service';

@Module({
  imports: [PrismaModule],
  controllers: [CarouselsController],
  providers: [CarouselsService],
  exports: [CarouselsService]
})
export class CarouselsModule {}
