import { useEffect, useRef, useState } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import toast from 'react-hot-toast';

export interface SSEEvent {
  type: string;
  // eslint-disable-next-line
  data: any;
  timestamp?: string;
}

export interface SSEConnection {
  connected: boolean;
  connectionId?: string;
  activeConnections?: number;
}

export function useSSE() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<SSEConnection>({ connected: false });
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!user) {
    //   console.log('No user available, skipping SSE connection');
      return;
    }

    try {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Use relative URL to go through proxy
      const sseUrl = `/api/stream?role=${user.role}&user_id=${user.id}`;
      
    //   console.log('Connecting to SSE:', sseUrl);
      
      // Create EventSource
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        // console.log('SSE connection opened');
        setConnection({ connected: true });
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const eventData: SSEEvent = JSON.parse(event.data);
        //   console.log('SSE event received:', eventData);
          
          setLastEvent(eventData);

          // Handle specific event types
          switch (eventData.type) {
            case 'connection':
              setConnection({
                connected: true,
                connectionId: eventData.data.connectionId,
                activeConnections: eventData.data.activeConnections,
              });
            //   console.log('SSE connection established:', eventData.data);
              break;

            case 'status_update':
              toast.custom(eventData.data.message, {
                // title: 'Status Update',
                // description: eventData.data.message,
                duration: 3000,
                
              });
              break;

            case 'visit_created':
              if (user.role === 'pa' || user.role === 'admin') {
                toast.success(`Token ${eventData.data.token} - ${eventData.data.name} (${eventData.data.service})`, {
                  duration: 5000,
                });
              }
              break;

            case 'visit_approved':
              if (user.role === 'reception' || user.role === 'consultant') {
                toast.success(`Token ${eventData.data.token} approved ${eventData.data.assignedConsultant ? `for ${eventData.data.assignedConsultant}` : ''}`, {
                  duration: 5000,
                });
              }
              break;

            case 'visit_denied':
              if (user.role === 'reception') {
                toast.error(`Token ${eventData.data.token} was denied`, {
                //   title: 'Visit Denied',
                //   variant: 'destructive',
                  duration: 5000,
                });
              }
              break;

            case 'visit_in_session':
              if (user.role === 'reception' || user.role === 'pa' || user.role === 'admin') {
                toast.success(`Token ${eventData.data.token} session has started`, {
                  // title: 'Session Started',
                  duration: 3000,
                });
              }
              break;

            case 'visit_completed':
              if (user.role === 'reception' || user.role === 'pa' || user.role === 'admin') {
                toast.success(`Token ${eventData.data.token} session completed`, {
                //   title: 'Session Completed',
                //   description: `Token ${eventData.data.token} session completed`,
                  duration: 3000,
                });
              }
              break;

            case 'notification':
              switch (eventData.data.type) {
                  case 'error':
                    toast.error(eventData.data.message, {
                      duration: eventData.data.duration || 5000,
                    });
                  default:
                    toast.success(eventData.data.message, {
                      duration: 3000,
                    });
              }

              toast.success(eventData.data.message, {
                // title: 'Notification',
                // description: eventData.data.message,
                // variant: eventData.data.type === 'error' ? 'destructive' : 'default',
                duration: eventData.data.duration || 5000,
              });
              break;

            case 'heartbeat':
              // Update connection status with heartbeat info
              setConnection(prev => ({
                ...prev,
                activeConnections: eventData.data.activeConnections,
              }));
              break;

            default:
            //   console.log('Unhandled SSE event type:', eventData.type);
              break;
          }
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnection({ connected: false });
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
        //   console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              connect();
            }
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
          toast.error('Real-time updates are unavailable. Please refresh the page.', {
            // title: 'Connection Lost',
            // description: 'Real-time updates are unavailable. Please refresh the page.',
            // variant: 'destructive',
            duration: 10000,
          });
        }
      };

    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      setConnection({ connected: false });
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnection({ connected: false });
    setLastEvent(null);
    reconnectAttemptsRef.current = 0;
  };

  // Send notification to other users (admin/PA only)
  const sendNotification = async (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', targetRoles?: string[]) => {
    try {
      // Use relative URL to go through proxy
      
      const response = await fetch(`/api/stream/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          type,
          target_roles: targetRoles,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connection,
    lastEvent,
    sendNotification,
    reconnect: connect,
    disconnect,
  };
}