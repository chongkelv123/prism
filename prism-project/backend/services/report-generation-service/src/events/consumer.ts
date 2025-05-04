import amqplib, { Channel, Connection } from 'amqplib';
import { processReportGenerationRequest } from '../controllers/reportController';
import logger from '../utils/logger';

let connection: Connection;
let channel: Channel;

// Event types
export enum ReportEventType {
  REPORT_REQUESTED = 'report.requested',
  REPORT_GENERATED = 'report.generated',
  REPORT_FAILED = 'report.failed'
}

/**
 * Connect to RabbitMQ and set up consumers
 */
export async function connectEventBus() {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqplib.connect(url);
    channel = await connection.createChannel();
    
    // Set up exchange
    const exchange = process.env.RABBITMQ_EXCHANGE || 'prism.events';
    await channel.assertExchange(exchange, 'topic', { durable: true });
    
    // Create a queue for report generation
    const queueName = 'report-generation-service';
    await channel.assertQueue(queueName, { durable: true });
    
    // Bind queue to exchange with routing key
    await channel.bindQueue(queueName, exchange, ReportEventType.REPORT_REQUESTED);
    
    // Consume messages
    await channel.consume(queueName, async (msg) => {
      if (!msg) return;
      
      try {
        const content = JSON.parse(msg.content.toString());
        logger.info(`Received message: ${msg.fields.routingKey}`, content);
        
        // Process the report generation request
        await processReportGenerationRequest(content);
        
        // Acknowledge the message
        channel.ack(msg);
      } catch (error) {
        logger.error('Error processing message:', error);
        // Negative acknowledgment, requeue if it's a temporary error
        channel.nack(msg, false, false);
      }
    });
    
    logger.info('Connected to RabbitMQ and listening for report requests');
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

/**
 * Publish an event to the message bus
 * @param routingKey Routing key for the message
 * @param payload Message payload
 */
export async function publishEvent(routingKey: string, payload: object) {
  try {
    const exchange = process.env.RABBITMQ_EXCHANGE || 'prism.events';
    
    if (!channel) {
      throw new Error('Channel not initialized');
    }
    
    channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
    
    logger.info(`Published event: ${routingKey}`, payload);
  } catch (error) {
    logger.error('Error publishing event:', error);
    throw error;
  }
}

/**
 * Close connection to RabbitMQ
 */
export async function closeEventBus() {
  if (channel) await channel.close();
  if (connection) await connection.close();
  logger.info('Closed RabbitMQ connection');
}