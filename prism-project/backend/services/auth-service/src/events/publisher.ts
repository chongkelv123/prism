// src/events/publisher.ts
import amqp from 'amqplib';
import { logger } from '../utils/logger';

// Define event types for auth service
export enum AuthEventType {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
}

// Base event interface
interface Event {
  type: string;
  data: any;
  timestamp: number;
}

class EventPublisher {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName: string = 'prism_events';
  private isInitialized: boolean = false;

  /**
   * Initialize the RabbitMQ connection and channel
   */
  async init(): Promise<void> {
    try {
      if (this.isInitialized) return;

      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
      
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      // Use a topic exchange for more flexible routing
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      
      this.isInitialized = true;
      logger.info('Event publisher initialized successfully');
      
      // Handle connection close
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isInitialized = false;
        // Attempt to reconnect after a delay
        setTimeout(() => this.init(), 5000);
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to initialize event publisher: ${error.message}`);
      } else {
        logger.error('Unknown error initializing event publisher');
      }
      throw error;
    }
  }

  /**
   * Publish an event to the message broker
   * @param eventType The type of event (used as routing key)
   * @param data The event payload
   */
  async publish<T>(eventType: AuthEventType, data: T): Promise<void> {
    try {
      if (!this.isInitialized || !this.channel) {
        await this.init();
      }

      const event: Event = {
        type: eventType,
        data,
        timestamp: Date.now(),
      };

      // Publish message to exchange with routing key = event type
      this.channel!.publish(
        this.exchangeName,
        eventType,
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );

      logger.info(`Event published: ${eventType}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to publish event: ${error.message}`);
      } else {
        logger.error('Unknown error publishing event');
      }
      throw error;
    }
  }

  /**
   * Close the connection to RabbitMQ
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isInitialized = false;
      logger.info('Event publisher closed');
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error closing event publisher: ${error.message}`);
      }
    }
  }
}

// Create and export a singleton instance
export const eventPublisher = new EventPublisher();