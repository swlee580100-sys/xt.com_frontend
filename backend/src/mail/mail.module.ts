import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { MailService } from './mail.service';
import { MAIL_TRANSPORT } from './mail.constants';

@Module({
  imports: [ConfigModule],
  providers: [
    MailService,
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        nodemailer.createTransport({
          host: configService.get<string>('mail.host'),
          port: configService.get<number>('mail.port'),
          secure: configService.get<number>('mail.port') === 465,
          auth: {
            user: configService.get<string>('mail.user'),
            pass: configService.get<string>('mail.password')
          }
        })
    }
  ],
  exports: [MailService]
})
export class MailModule {}
