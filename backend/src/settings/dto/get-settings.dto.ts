import { IsOptional, IsString } from 'class-validator';

export class GetSettingsDto {
  @IsOptional()
  @IsString()
  category?: string; // 可选：按分类筛选
}

