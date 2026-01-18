import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RabbitMQMonitorService } from './monitor.service';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Alert interface
 */
export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * RabbitMQ Alerting Service
 * Monitors RabbitMQ metrics and generates alerts based on thresholds
 */
@Injectable()
export class RabbitMQAlertingService {
  private readonly logger = new Logger(RabbitMQAlertingService.name);
  private alerts: Map<string, Alert> = new Map();
  private alertCallbacks: Array<(alert: Alert) => Promise<void>> = [];

  // Alert thresholds
  private readonly QUEUE_DEPTH_WARNING_THRESHOLD = 5000;
  private readonly QUEUE_DEPTH_CRITICAL_THRESHOLD = 10000;
  private readonly DLQ_WARNING_THRESHOLD = 50;
  private readonly DLQ_CRITICAL_THRESHOLD = 100;
  private readonly NO_CONSUMER_WARNING_THRESHOLD = 2; // minutes

  constructor(private readonly monitorService: RabbitMQMonitorService) {}

  /**
   * Register a callback for alerts
   */
  onAlert(callback: (alert: Alert) => Promise<void>): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Check for alerts every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlerts(): Promise<void> {
    try {
      const metrics = await this.monitorService.getMetrics();

      // Check connection health
      await this.checkConnectionHealth(metrics.connectionHealth);

      // Check queue depths
      for (const [queue, depth] of Object.entries(metrics.queueDepths)) {
        await this.checkQueueDepth(queue, depth);
      }

      // Check consumer counts
      for (const [queue, count] of Object.entries(metrics.consumerCounts)) {
        await this.checkConsumerCount(queue, count);
      }

      // Check DLQ depth
      await this.checkDLQDepth(metrics.dlqDepth);

      // Resolve alerts that are no longer triggered
      this.resolveStaleAlerts();
    } catch (error) {
      this.logger.error('Error checking alerts:', error);
    }
  }

  /**
   * Check connection health
   */
  private async checkConnectionHealth(health: number): Promise<void> {
    const alertId = 'connection-health';

    if (health === 0) {
      await this.createAlert(
        alertId,
        AlertSeverity.CRITICAL,
        'RabbitMQ Connection Down',
        'RabbitMQ connection is not responding',
        { health },
      );
    } else {
      this.resolveAlert(alertId);
    }
  }

  /**
   * Check queue depth
   */
  private async checkQueueDepth(queue: string, depth: number): Promise<void> {
    const warningAlertId = `queue-depth-warning-${queue}`;
    const criticalAlertId = `queue-depth-critical-${queue}`;

    if (depth >= this.QUEUE_DEPTH_CRITICAL_THRESHOLD) {
      await this.createAlert(
        criticalAlertId,
        AlertSeverity.CRITICAL,
        `Critical Queue Depth: ${queue}`,
        `Queue ${queue} has reached critical depth of ${depth} messages`,
        { queue, depth },
      );
      this.resolveAlert(warningAlertId);
    } else if (depth >= this.QUEUE_DEPTH_WARNING_THRESHOLD) {
      await this.createAlert(
        warningAlertId,
        AlertSeverity.WARNING,
        `High Queue Depth: ${queue}`,
        `Queue ${queue} has ${depth} messages (threshold: ${this.QUEUE_DEPTH_WARNING_THRESHOLD})`,
        { queue, depth },
      );
      this.resolveAlert(criticalAlertId);
    } else {
      this.resolveAlert(warningAlertId);
      this.resolveAlert(criticalAlertId);
    }
  }

  /**
   * Check consumer count
   */
  private async checkConsumerCount(queue: string, count: number): Promise<void> {
    const alertId = `no-consumers-${queue}`;

    if (count === 0) {
      await this.createAlert(
        alertId,
        AlertSeverity.WARNING,
        `No Consumers: ${queue}`,
        `Queue ${queue} has no active consumers`,
        { queue, consumerCount: count },
      );
    } else {
      this.resolveAlert(alertId);
    }
  }

  /**
   * Check DLQ depth
   */
  private async checkDLQDepth(depth: number): Promise<void> {
    const warningAlertId = 'dlq-depth-warning';
    const criticalAlertId = 'dlq-depth-critical';

    if (depth >= this.DLQ_CRITICAL_THRESHOLD) {
      await this.createAlert(
        criticalAlertId,
        AlertSeverity.CRITICAL,
        'Critical DLQ Depth',
        `Dead Letter Queue has reached critical depth of ${depth} messages`,
        { dlqDepth: depth },
      );
      this.resolveAlert(warningAlertId);
    } else if (depth >= this.DLQ_WARNING_THRESHOLD) {
      await this.createAlert(
        warningAlertId,
        AlertSeverity.WARNING,
        'High DLQ Depth',
        `Dead Letter Queue has ${depth} messages (threshold: ${this.DLQ_WARNING_THRESHOLD})`,
        { dlqDepth: depth },
      );
      this.resolveAlert(criticalAlertId);
    } else if (depth > 0) {
      await this.createAlert(
        'dlq-has-messages',
        AlertSeverity.INFO,
        'DLQ Has Messages',
        `Dead Letter Queue has ${depth} messages`,
        { dlqDepth: depth },
      );
    } else {
      this.resolveAlert(warningAlertId);
      this.resolveAlert(criticalAlertId);
      this.resolveAlert('dlq-has-messages');
    }
  }

  /**
   * Create or update an alert
   */
  private async createAlert(
    id: string,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const existingAlert = this.alerts.get(id);

    if (existingAlert && !existingAlert.resolved) {
      // Alert already exists and is not resolved, just update metadata
      existingAlert.metadata = metadata;
      return;
    }

    const alert: Alert = {
      id,
      severity,
      title,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata,
    };

    this.alerts.set(id, alert);
    this.logger.warn(`Alert created: ${title} - ${message}`);

    // Trigger callbacks
    for (const callback of this.alertCallbacks) {
      try {
        await callback(alert);
      } catch (error) {
        this.logger.error('Error in alert callback:', error);
      }
    }
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(id: string): void {
    const alert = this.alerts.get(id);

    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.logger.log(`Alert resolved: ${alert.title}`);
    }
  }

  /**
   * Resolve stale alerts (alerts that have been resolved for more than 1 hour)
   */
  private resolveStaleAlerts(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < oneHourAgo) {
        this.alerts.delete(id);
      }
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((alert) => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alerts.values()).filter(
      (alert) => alert.severity === severity && !alert.resolved,
    );
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(): Alert[] {
    return this.getAlertsBySeverity(AlertSeverity.CRITICAL);
  }

  /**
   * Get warning alerts
   */
  getWarningAlerts(): Alert[] {
    return this.getAlertsBySeverity(AlertSeverity.WARNING);
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): void {
    this.alerts.clear();
    this.logger.log('All alerts cleared');
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): void {
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved) {
        this.alerts.delete(id);
      }
    }
    this.logger.log('Resolved alerts cleared');
  }

  /**
   * Get alert summary
   */
  getAlertSummary(): {
    total: number;
    active: number;
    critical: number;
    warning: number;
    info: number;
  } {
    const alerts = Array.from(this.alerts.values());
    const activeAlerts = alerts.filter((a) => !a.resolved);

    return {
      total: alerts.length,
      active: activeAlerts.length,
      critical: activeAlerts.filter((a) => a.severity === AlertSeverity.CRITICAL)
        .length,
      warning: activeAlerts.filter((a) => a.severity === AlertSeverity.WARNING)
        .length,
      info: activeAlerts.filter((a) => a.severity === AlertSeverity.INFO).length,
    };
  }
}
