export class SettingResponseDto {
  id!: string;
  key!: string;
  value!: any;
  category!: string;
  description?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class SettingsByCategoryResponseDto {
  admin?: SettingResponseDto[];
  trading?: SettingResponseDto[];
  customer_service?: SettingResponseDto[];
  latency?: SettingResponseDto[];
  [key: string]: SettingResponseDto[] | undefined;
}

