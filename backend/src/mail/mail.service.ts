import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';

import { MAIL_TRANSPORT } from './mail.constants';

interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  context?: Record<string, unknown>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: Transporter,
    private readonly configService: ConfigService
  ) {}

  async send(options: SendMailOptions): Promise<void> {
    const from = this.configService.get<string>('mail.from');

    try {
      await this.transport.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });
      this.logger.debug(`Sent mail to ${options.to} with subject ${options.subject}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to send email', err.stack);
      throw err;
    }
  }
}
