import apiClient from './api.service';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'processing';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actions?: {
    label: string;
    action: string;
    id: string;
  }[];
}

// Type for notification event listener
export type NotificationListener = (notification: Notification) => void;

class NotificationService {
  private listeners: NotificationListener[] = [];
  private pollingInterval: number | null = null;
  
  // Get all notifications
  async getNotifications(): Promise<Notification[]> {
    const response = await apiClient.get('/api/notifications');
    return response.data;
  }
  
  // Mark notification as read
  async markAsRead(id: string): Promise<void> {
    await apiClient.put(`/api/notifications/${id}/read`);
  }
  
  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    await apiClient.put('/api/notifications/read-all');
  }
  
  // Subscribe to notifications (could be WebSocket or polling)
  subscribeToNotifications(listener: NotificationListener): string {
    const id = Date.now().toString();
    this.listeners.push(listener);
    
    // Start polling if this is the first listener
    if (this.listeners.length === 1) {
      this.startPolling();
    }
    
    return id;
  }
  
  // Unsubscribe from notifications
  unsubscribeFromNotifications(id: string): void {
    const index = this.listeners.findIndex(l => l === this.listeners[parseInt(id)]);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
    
    // Stop polling if no more listeners
    if (this.listeners.length === 0) {
      this.stopPolling();
    }
  }
  
  // Poll for new notifications
  private startPolling(): void {
    // Poll every 30 seconds
    this.pollingInterval = window.setInterval(async () => {
      try {
        const notifications = await this.getNotifications();
        const unreadNotifications = notifications.filter(n => !n.read);
        
        // Notify listeners
        unreadNotifications.forEach(notification => {
          this.listeners.forEach(listener => {
            listener(notification);
          });
        });
      } catch (error) {
        console.error('Failed to poll for notifications', error);
      }
    }, 30000);
  }
  
  // Stop polling
  private stopPolling(): void {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export default new NotificationService();