import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { MailService } from '../../mail/mail.service';

interface NotificationJob {
  template: string;
  payload: Record<string, unknown>;
  recipient: string;
}

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<NotificationJob>) {
    this.logger.debug(`Processing notification job ${job.id} (${job.name})`);

    if (job.name === 'send-notification') {
      await this.mailService.send({
        to: job.data.recipient,
        subject: `Notification: ${job.data.template}`,
        text: JSON.stringify(job.data.payload, null, 2)
      });
    }
  }
}
