import amqplib, { Channel } from 'amqplib';
import logger from '../utils/logger';

export enum AuthEventType {
  USER_CREATED = 'user.created',
  USER_LOGGED_IN = 'user.logged_in'
}

class Publisher {
  private channel!: Channel;
  private exchange = process.env.RABBITMQ_EXCHANGE!;

  async init() {
    const url = process.env.RABBITMQ_URL;
    if (!url) throw new Error('RABBITMQ_URL not set');
    const conn = await amqplib.connect(url);
    this.channel = await conn.createChannel();
    await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
    logger.info('RabbitMQ connected');
  }

  publish(routingKey: string, payload: object) {
    this.channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
    logger.info(`Event published: ${routingKey}`, payload);
  }

  async close() {
    await this.channel.close();
    logger.info('RabbitMQ channel closed');
  }
}

export const eventPublisher = new Publisher();
