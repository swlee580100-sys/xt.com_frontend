import { Controller, Get, Logger, Param, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';

import { Public } from '../common/decorators/public.decorator';

@Controller('market')
export class MarketDataController {
  private readonly logger = new Logger(MarketDataController.name);
  // 使用多个 Binance API 端点作为备选
  private readonly BINANCE_BASE_URLS = [
    'https://api.binance.com/api/v3',
    'https://api1.binance.com/api/v3',
    'https://api2.binance.com/api/v3',
    'https://api3.binance.com/api/v3',
  ];
  private readonly BINANCE_BASE_URL = this.BINANCE_BASE_URLS[0];

  constructor(private readonly httpService: HttpService) {}

  /**
   * 获取单个交易对的24小时价格统计
   * @param symbol - 交易对符号，如 BTCUSDT
   */
  @Public()
  @Get('ticker/:symbol')
  async getTicker(@Param('symbol') symbol: string) {
    const normalizedSymbol = symbol.toUpperCase();
    const url = `${this.BINANCE_BASE_URL}/ticker/24hr?symbol=${normalizedSymbol}`;
    
    try {
      this.logger.log(`Fetching ticker for ${normalizedSymbol} from ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 10000, // 10秒超时
        }).pipe(
          catchError((error: AxiosError) => {
            const errorMessage = error.message || 'Unknown error';
            const statusCode = error.response?.status || 'N/A';
            const statusText = error.response?.statusText || 'N/A';
            
            this.logger.error(`Axios error for ${normalizedSymbol}:`, {
              message: errorMessage,
              statusCode,
              statusText,
              url: error.config?.url,
              code: error.code,
              response: error.response?.data
            });
            
            // 如果是网络错误或超时
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
              throw new HttpException(
                `无法连接到 Binance API: ${errorMessage}`,
                HttpStatus.BAD_GATEWAY
              );
            }
            
            // 如果是 HTTP 错误
            if (error.response) {
              throw new HttpException(
                `Binance API 错误 (${statusCode}): ${statusText}`,
                error.response.status || HttpStatus.BAD_GATEWAY
              );
            }
            
            throw new HttpException(
              `Failed to fetch data from Binance: ${errorMessage}`,
              HttpStatus.BAD_GATEWAY
            );
          })
        )
      );

      this.logger.log(`Successfully fetched ticker for ${normalizedSymbol}`);
      return {
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch ticker for ${normalizedSymbol}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `获取市场数据失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 获取多个交易对的24小时价格统计
   * @param symbols - 交易对符号数组（逗号分隔），如 BTCUSDT,ETHUSDT
   */
  @Public()
  @Get('tickers/:symbols')
  async getMultipleTickers(@Param('symbols') symbols: string) {
    try {
      const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
      this.logger.log(`Fetching tickers for ${symbolArray.join(', ')}`);

      // 并行请求多个交易对
      const promises = symbolArray.map(async (symbol) => {
        const url = `${this.BINANCE_BASE_URL}/ticker/24hr?symbol=${symbol}`;
        const response = await firstValueFrom(
          this.httpService.get(url, {
            timeout: 10000,
          }).pipe(
            catchError((error: AxiosError) => {
              this.logger.error(`Axios error for ${symbol}:`, error.message);
              throw new HttpException(
                `Failed to fetch ${symbol}: ${error.message}`,
                HttpStatus.BAD_GATEWAY
              );
            })
          )
        );
        return response.data;
      });

      const data = await Promise.all(promises);

      return {
        data,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch tickers for ${symbols}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch market data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
