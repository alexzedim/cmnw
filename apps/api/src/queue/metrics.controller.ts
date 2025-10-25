import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrometheusController } from '@willsoto/nestjs-prometheus';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly prometheusController: PrometheusController) {}

  @Get()
  async getMetrics(@Res({ passthrough: false }) res: Response) {
    return this.prometheusController.index(res);
  }
}
