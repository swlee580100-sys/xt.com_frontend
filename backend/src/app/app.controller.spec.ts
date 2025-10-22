import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService]
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  it('should expose health endpoint', () => {
    expect(appController.healthCheck()).toEqual({ status: 'ok' });
  });
});
