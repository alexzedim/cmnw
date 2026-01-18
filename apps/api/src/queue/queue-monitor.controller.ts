import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AlertSeverity,
  RabbitMQAlertingService,
  RabbitMQMonitorService,
} from '@app/rabbitmq';
import { QueueMonitorService } from './queue-monitor.service';
import {
  IAllQueuesStats,
  IQueueDetailedProgress,
} from './types/queue-monitor.types';

@ApiTags('queue')
@Controller('queue-monitor')
export class QueueMonitorController {
  constructor(private readonly queueMonitorService: QueueMonitorService) {}

  @Get('stats')
  async getAllQueuesStats(): Promise<IAllQueuesStats> {
    return this.queueMonitorService.getAllQueuesStats();
  }

  @Get('stats/:queueName')
  async getQueueDetailedProgress(
    @Param('queueName') queueName: string,
  ): Promise<IQueueDetailedProgress> {
    return this.queueMonitorService.getQueueDetailedProgress(queueName);
  }

  @Post('pause/:queueName')
  async pauseQueue(@Param('queueName') queueName: string): Promise<void> {
    return this.queueMonitorService.pauseQueue(queueName);
  }

  @Post('resume/:queueName')
  async resumeQueue(@Param('queueName') queueName: string): Promise<void> {
    return this.queueMonitorService.resumeQueue(queueName);
  }

  @Get('worker-stats')
  async getAllWorkerStats(): Promise<any[]> {
    return this.queueMonitorService.getAllWorkerStats();
  }

  @Get('worker-stats/:workerName')
  async getWorkerStats(@Param('workerName') workerName: string): Promise<any> {
    return this.queueMonitorService.getWorkerStats(workerName);
  }
}

@ApiTags('queue')
@Controller('queue')
export class QueueRabbitMQController {
  constructor(
    private readonly monitorService: RabbitMQMonitorService,
    private readonly alertingService: RabbitMQAlertingService,
  ) {}

  /**
   * Get overall RabbitMQ health status
   * @returns Health status with connection, queue, and consumer information
   */
  @Get('health/rabbitmq')
  async getHealthStatus() {
    const metrics = await this.monitorService.getMetrics();

    const isHealthy = metrics.connectionHealth === 1;
    const hasConsumers = Object.values(metrics.consumerCounts).some(
      (count) => count > 0,
    );
    const queueDepthsNormal = Object.values(metrics.queueDepths).every(
      (depth) => depth < 10000,
    );

    return {
      status:
        isHealthy && hasConsumers && queueDepthsNormal ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      connection: {
        status: isHealthy ? 'connected' : 'disconnected',
        health: metrics.connectionHealth,
      },
      queues: {
        depths: metrics.queueDepths,
        consumers: metrics.consumerCounts,
        dlqDepth: metrics.dlqDepth,
      },
      summary: {
        totalQueueDepth: Object.values(metrics.queueDepths).reduce(
          (a, b) => a + b,
          0,
        ),
        totalConsumers: Object.values(metrics.consumerCounts).reduce(
          (a, b) => a + b,
          0,
        ),
        dlqDepth: metrics.dlqDepth,
      },
    };
  }

  /**
   * Get detailed metrics for all queues
   * @returns Detailed metrics including queue depths and consumer counts
   */
  @Get('health/rabbitmq/metrics')
  async getRabbitMQMetrics() {
    const metrics = await this.monitorService.getMetrics();

    return {
      timestamp: new Date().toISOString(),
      metrics,
      queues: {
        osint: {
          characters: {
            depth: metrics.queueDepths['osint.characters'] || 0,
            consumers: metrics.consumerCounts['osint.characters'] || 0,
          },
          guilds: {
            depth: metrics.queueDepths['osint.guilds'] || 0,
            consumers: metrics.consumerCounts['osint.guilds'] || 0,
          },
          profiles: {
            depth: metrics.queueDepths['osint.profiles'] || 0,
            consumers: metrics.consumerCounts['osint.profiles'] || 0,
          },
        },
        dma: {
          auctions: {
            depth: metrics.queueDepths['dma.auctions'] || 0,
            consumers: metrics.consumerCounts['dma.auctions'] || 0,
          },
          items: {
            depth: metrics.queueDepths['dma.items'] || 0,
            consumers: metrics.consumerCounts['dma.items'] || 0,
          },
        },
        dlq: {
          depth: metrics.dlqDepth,
        },
      },
    };
  }

  /**
   * Get health status for a specific queue
   * @param queueName - Name of the queue to check
   * @returns Queue-specific health information
   */
  @Get('health/rabbitmq/queue/:queueName')
  async getQueueHealth(@Param('queueName') queueName: string) {
    const stats = await this.monitorService.getQueueStats(queueName);

    if (!stats) {
      return {
        status: 'not_found',
        queue: queueName,
        message: `Queue ${queueName} not found`,
      };
    }

    const isHealthy = stats.consumerCount > 0 && stats.messageCount < 5000;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      queue: queueName,
      timestamp: new Date().toISOString(),
      stats,
      alerts: {
        noConsumers: stats.consumerCount === 0,
        highQueueDepth: stats.messageCount > 5000,
        criticalQueueDepth: stats.messageCount > 10000,
      },
    };
  }

  /**
   * Get Dead Letter Queue (DLQ) status
   * @returns DLQ depth and recent messages
   */
  @Get('health/rabbitmq/dlq/status')
  async getDLQStatus() {
    const metrics = await this.monitorService.getMetrics();
    const dlqMessages = await this.monitorService.getDLQMessages(5);

    return {
      status: metrics.dlqDepth > 0 ? 'has_messages' : 'empty',
      timestamp: new Date().toISOString(),
      dlqDepth: metrics.dlqDepth,
      recentMessages: dlqMessages,
      alerts: {
        dlqNotEmpty: metrics.dlqDepth > 0,
        dlqCritical: metrics.dlqDepth > 100,
      },
    };
  }

  /**
   * Get DLQ messages
   * @param limit - Number of messages to retrieve (default: 10)
   * @returns Array of DLQ messages
   */
  @Get('health/rabbitmq/dlq/messages/:limit')
  async getDLQMessages(@Param('limit') limit: string = '10') {
    const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
    const messages = await this.monitorService.getDLQMessages(limitNum);

    return {
      timestamp: new Date().toISOString(),
      count: messages.length,
      messages,
    };
  }

  /**
   * Purge a queue (use with caution)
   * @param queueName - Name of the queue to purge
   * @returns Success status
   */
  @Post('health/rabbitmq/queue/:queueName/purge')
  @HttpCode(HttpStatus.OK)
  async purgeQueue(@Param('queueName') queueName: string) {
    const success = await this.monitorService.purgeQueue(queueName);

    return {
      status: success ? 'success' : 'failed',
      queue: queueName,
      timestamp: new Date().toISOString(),
      message: success
        ? `Queue ${queueName} has been purged`
        : `Failed to purge queue ${queueName}`,
    };
  }

  /**
   * Get connection status
   * @returns Connection health information
   */
  @Get('health/rabbitmq/connection')
  async getConnectionStatus() {
    const metrics = await this.monitorService.getMetrics();

    return {
      status: metrics.connectionHealth === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      health: metrics.connectionHealth,
      details: {
        connected: metrics.connectionHealth === 1,
        lastCheck: new Date().toISOString(),
      },
    };
  }

  /**
   * Get comprehensive health report
   * @returns Full health report with all metrics and alerts
   */
  @Get('health/rabbitmq/report')
  async getHealthReport() {
    const metrics = await this.monitorService.getMetrics();
    const dlqMessages = await this.monitorService.getDLQMessages(3);

    const totalQueueDepth = Object.values(metrics.queueDepths).reduce(
      (a, b) => a + b,
      0,
    );
    const totalConsumers = Object.values(metrics.consumerCounts).reduce(
      (a, b) => a + b,
      0,
    );
    const queuesWithoutConsumers = Object.entries(metrics.consumerCounts)
      .filter(([, count]) => count === 0)
      .map(([queue]) => queue);

    const alerts = [];
    if (metrics.connectionHealth === 0) {
      alerts.push({
        severity: 'critical',
        message: 'RabbitMQ connection is down',
      });
    }
    if (queuesWithoutConsumers.length > 0) {
      alerts.push({
        severity: 'warning',
        message: `Queues without consumers: ${queuesWithoutConsumers.join(', ')}`,
      });
    }
    if (totalQueueDepth > 10000) {
      alerts.push({
        severity: 'warning',
        message: `High queue depth: ${totalQueueDepth} messages`,
      });
    }
    if (metrics.dlqDepth > 100) {
      alerts.push({
        severity: 'warning',
        message: `Dead Letter Queue has ${metrics.dlqDepth} messages`,
      });
    }

    return {
      timestamp: new Date().toISOString(),
      overallStatus:
        alerts.length === 0
          ? 'healthy'
          : alerts.some((a) => a.severity === 'critical')
            ? 'critical'
            : 'degraded',
      summary: {
        connectionHealth:
          metrics.connectionHealth === 1 ? 'connected' : 'disconnected',
        totalQueueDepth,
        totalConsumers,
        dlqDepth: metrics.dlqDepth,
        queuesMonitored: Object.keys(metrics.queueDepths).length,
      },
      queues: metrics.queueDepths,
      consumers: metrics.consumerCounts,
      alerts,
      recentDLQMessages: dlqMessages,
    };
  }

  // RabbitMQ Alerting Endpoints

  /**
   * Get all active alerts
   * @returns Array of active alerts
   */
  @Get('alerts/rabbitmq')
  getActiveAlerts() {
    const alerts = this.alertingService.getActiveAlerts();
    const summary = this.alertingService.getAlertSummary();

    return {
      timestamp: new Date().toISOString(),
      summary,
      alerts,
    };
  }

  /**
   * Get alert summary
   * @returns Alert summary with counts by severity
   */
  @Get('alerts/rabbitmq/summary')
  getAlertSummary() {
    const summary = this.alertingService.getAlertSummary();

    return {
      timestamp: new Date().toISOString(),
      summary,
    };
  }

  /**
   * Get all alerts (including resolved)
   * @returns Array of all alerts
   */
  @Get('alerts/rabbitmq/all')
  getAllAlerts() {
    const alerts = this.alertingService.getAllAlerts();

    return {
      timestamp: new Date().toISOString(),
      count: alerts.length,
      alerts,
    };
  }

  /**
   * Get critical alerts
   * @returns Array of critical alerts
   */
  @Get('alerts/rabbitmq/critical')
  getCriticalAlerts() {
    const alerts = this.alertingService.getCriticalAlerts();

    return {
      timestamp: new Date().toISOString(),
      count: alerts.length,
      alerts,
    };
  }

  /**
   * Get warning alerts
   * @returns Array of warning alerts
   */
  @Get('alerts/rabbitmq/warning')
  getWarningAlerts() {
    const alerts = this.alertingService.getWarningAlerts();

    return {
      timestamp: new Date().toISOString(),
      count: alerts.length,
      alerts,
    };
  }

  /**
   * Get alerts by severity
   * @param severity - Alert severity level (info, warning, critical)
   * @returns Array of alerts with specified severity
   */
  @Get('alerts/rabbitmq/severity/:severity')
  getAlertsBySeverity(@Param('severity') severity: string) {
    const severityEnum = severity.toLowerCase() as AlertSeverity;

    if (!Object.values(AlertSeverity).includes(severityEnum)) {
      return {
        error: 'Invalid severity level',
        validValues: Object.values(AlertSeverity),
      };
    }

    const alerts = this.alertingService.getAlertsBySeverity(severityEnum);

    return {
      timestamp: new Date().toISOString(),
      severity: severityEnum,
      count: alerts.length,
      alerts,
    };
  }

  /**
   * Clear all alerts
   * @returns Success status
   */
  @Delete('alerts/rabbitmq')
  clearAllAlerts() {
    this.alertingService.clearAllAlerts();

    return {
      status: 'success',
      message: 'All alerts cleared',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear resolved alerts
   * @returns Success status
   */
  @Delete('alerts/rabbitmq/resolved')
  clearResolvedAlerts() {
    this.alertingService.clearResolvedAlerts();

    return {
      status: 'success',
      message: 'Resolved alerts cleared',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get alert statistics
   * @returns Alert statistics and trends
   */
  @Get('alerts/rabbitmq/stats')
  getAlertStats() {
    const summary = this.alertingService.getAlertSummary();
    const allAlerts = this.alertingService.getAllAlerts();

    // Calculate alert trends
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const alertsLastHour = allAlerts.filter((a) => a.timestamp > oneHourAgo).length;
    const alertsLastDay = allAlerts.filter((a) => a.timestamp > oneDayAgo).length;

    // Group alerts by type
    const alertsByType: Record<string, number> = {};
    for (const alert of allAlerts) {
      const type = alert.title.split(':')[0];
      alertsByType[type] = (alertsByType[type] || 0) + 1;
    }

    return {
      timestamp: new Date().toISOString(),
      summary,
      trends: {
        alertsLastHour,
        alertsLastDay,
      },
      byType: alertsByType,
    };
  }

  /**
   * Get alert history
   * @returns Recent alerts with timestamps
   */
  @Get('alerts/rabbitmq/history')
  getAlertHistory() {
    const allAlerts = this.alertingService.getAllAlerts();

    // Sort by timestamp descending
    const sortedAlerts = allAlerts.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    return {
      timestamp: new Date().toISOString(),
      count: sortedAlerts.length,
      alerts: sortedAlerts.slice(0, 50), // Return last 50 alerts
    };
  }

  /**
   * Get alert details by ID
   * @param alertId - Alert ID
   * @returns Alert details
   */
  @Get('alerts/rabbitmq/detail/:alertId')
  getAlertDetail(@Param('alertId') alertId: string) {
    const allAlerts = this.alertingService.getAllAlerts();
    const alert = allAlerts.find((a) => a.id === alertId);

    if (!alert) {
      return {
        error: 'Alert not found',
        alertId,
      };
    }

    return {
      timestamp: new Date().toISOString(),
      alert,
    };
  }
}
