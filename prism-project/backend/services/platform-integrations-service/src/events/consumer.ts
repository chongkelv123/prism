// backend/services/platform-integrations-service/src/events/consumer.ts
import amqplib, { Channel, Connection } from 'amqplib';
import logger from '../utils/logger';

let connection: Connection;
let channel: Channel;

// Event types that this service listens to
export enum PlatformEventType {
  CONNECTION_TEST_REQUESTED = 'connection.test.requested',
  CONNECTION_SYNC_REQUESTED = 'connection.sync.requested',
  REPORT_DATA_REQUESTED = 'report.data.requested'
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
    
    // Create a queue for platform integrations
    const queueName = 'platform-integrations-service';
    await channel.assertQueue(queueName, { durable: true });
    
    // Bind queue to exchange with routing keys we're interested in
    await channel.bindQueue(queueName, exchange, 'connection.*');
    await channel.bindQueue(queueName, exchange, 'report.data.*');
    
    // Consume messages
    await channel.consume(queueName, async (msg) => {
      if (!msg) return;
      
      try {
        const content = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;
        
        logger.info(`Received event: ${routingKey}`, content);
        
        // Process the event based on routing key
        await processEvent(routingKey, content);
        
        // Acknowledge the message
        channel.ack(msg);
      } catch (error) {
        logger.error('Error processing event:', error);
        // Negative acknowledgment, don't requeue to avoid infinite loops
        channel.nack(msg, false, false);
      }
    });
    
    logger.info('Connected to RabbitMQ and listening for platform events');
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    // Don't throw error, service should work without events
  }
}

/**
 * Process incoming events
 */
async function processEvent(routingKey: string, payload: any) {
  switch (routingKey) {
    case PlatformEventType.CONNECTION_TEST_REQUESTED:
      await handleConnectionTestRequest(payload);
      break;
      
    case PlatformEventType.CONNECTION_SYNC_REQUESTED:
      await handleConnectionSyncRequest(payload);
      break;
      
    case PlatformEventType.REPORT_DATA_REQUESTED:
      await handleReportDataRequest(payload);
      break;
      
    default:
      logger.warn(`Unhandled event type: ${routingKey}`);
  }
}

/**
 * Handle connection test requests
 */
async function handleConnectionTestRequest(payload: any) {
  try {
    logger.info('Processing connection test request:', payload);
    
    // Here you would:
    // 1. Get the connection from database
    // 2. Test the connection using appropriate client
    // 3. Update connection status
    // 4. Publish result event
    
    // For now, just log
    logger.info('Connection test completed (mock)');
  } catch (error) {
    logger.error('Error handling connection test request:', error);
  }
}

/**
 * Handle connection sync requests
 */
async function handleConnectionSyncRequest(payload: any) {
  try {
    logger.info('Processing connection sync request:', payload);
    
    // Here you would:
    // 1. Get the connection from database
    // 2. Sync data using appropriate client
    // 3. Update connection status and last sync time
    // 4. Publish result event
    
    // For now, just log
    logger.info('Connection sync completed (mock)');
  } catch (error) {
    logger.error('Error handling connection sync request:', error);
  }
}

/**
 * Handle report data requests
 */
async function handleReportDataRequest(payload: any) {
  try {
    logger.info('Processing report data request:', payload);
    
    // Here you would:
    // 1. Get the connection and project data
    // 2. Fetch data from the platform
    // 3. Format data for report generation
    // 4. Publish data to report generation service
    
    // For now, just log
    logger.info('Report data request completed (mock)');
  } catch (error) {
    logger.error('Error handling report data request:', error);
  }
}

/**
 * Publish an event to the message bus
 */
export async function publishEvent(routingKey: string, payload: object) {
  try {
    if (!channel) {
      logger.warn('Channel not available, cannot publish event:', routingKey);
      return;
    }
    
    const exchange = process.env.RABBITMQ_EXCHANGE || 'prism.events';
    
    channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
    
    logger.info(`Published event: ${routingKey}`, payload);
  } catch (error) {
    logger.error('Error publishing event:', error);
  }
}

/**
 * Close connection to RabbitMQ
 */
export async function closeEventBus() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('Closed RabbitMQ connection');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
}