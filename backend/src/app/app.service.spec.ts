import { AppService } from './app.service';

describe('AppService', () => {
  it('should return ok status', () => {
    const service = new AppService();
    expect(service.healthCheck()).toEqual({ status: 'ok' });
  });
});
