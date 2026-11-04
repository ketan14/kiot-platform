import { WebSocket } from 'ws';
import { redisSubscriber } from './redis.js';

export interface ClientMeta {
  userId: string;
  organizationId: string;
  role: string;
  isAlive: boolean;
  subscribedDevices: Set<string>; // empty set means all devices
}

export class WebSocketHub {
  private clients = new Map<WebSocket, ClientMeta>();
  private orgSubscriptions = new Map<string, Set<WebSocket>>();

  constructor() {
    this.setupRedisListener();
  }

  private setupRedisListener(): void {
    redisSubscriber.on('message', (channel: string, messageStr: string) => {
      // Channel pattern: org:{organizationId}:telemetry
      const parts = channel.split(':');
      if (parts.length < 3 || parts[0] !== 'org') return;

      const organizationId = parts[1];
      if (!organizationId) return;

      const targetSockets = this.orgSubscriptions.get(organizationId);
      if (!targetSockets || targetSockets.size === 0) return;

      let event: Record<string, unknown>;
      try {
        event = JSON.parse(messageStr);
      } catch {
        return;
      }

      const deviceId = event.deviceId as string | undefined;

      // Broadcast to all sockets subscribed to this organization
      for (const ws of targetSockets) {
        if (ws.readyState === WebSocket.OPEN) {
          const meta = this.clients.get(ws);
          if (!meta) continue;

          // If client has device filters, apply them
          if (meta.subscribedDevices.size > 0 && deviceId && !meta.subscribedDevices.has(deviceId)) {
            continue;
          }

          ws.send(messageStr);
        }
      }
    });
  }

  public addClient(ws: WebSocket, meta: Omit<ClientMeta, 'isAlive' | 'subscribedDevices'>): void {
    const fullMeta: ClientMeta = {
      ...meta,
      isAlive: true,
      subscribedDevices: new Set(),
    };

    this.clients.set(ws, fullMeta);

    // Track under organization
    if (!this.orgSubscriptions.has(meta.organizationId)) {
      this.orgSubscriptions.set(meta.organizationId, new Set());
      // First client for this org: subscribe to Redis channel
      const channel = `org:${meta.organizationId}:telemetry`;
      redisSubscriber.subscribe(channel, (err) => {
        if (err) {
          console.error(`[WS Hub] Failed to subscribe to Redis channel ${channel}:`, err);
        } else {
          console.log(`[WS Hub] Subscribed to Redis channel: ${channel}`);
        }
      });
    }

    this.orgSubscriptions.get(meta.organizationId)!.add(ws);

    console.log(
      `[WS Hub] Client connected (User: ${meta.userId}, Org: ${meta.organizationId}). Total clients in org: ${this.orgSubscriptions.get(meta.organizationId)!.size}`
    );
  }

  public removeClient(ws: WebSocket): void {
    const meta = this.clients.get(ws);
    if (!meta) return;

    this.clients.delete(ws);

    const orgSockets = this.orgSubscriptions.get(meta.organizationId);
    if (orgSockets) {
      orgSockets.delete(ws);
      if (orgSockets.size === 0) {
        this.orgSubscriptions.delete(meta.organizationId);
        const channel = `org:${meta.organizationId}:telemetry`;
        redisSubscriber.unsubscribe(channel);
        console.log(`[WS Hub] Unsubscribed from Redis channel: ${channel}`);
      }
    }

    console.log(`[WS Hub] Client disconnected (User: ${meta.userId}, Org: ${meta.organizationId})`);
  }

  public handleClientMessage(ws: WebSocket, message: string): void {
    const meta = this.clients.get(ws);
    if (!meta) return;

    try {
      const data = JSON.parse(message) as {
        action?: string;
        deviceId?: string;
        deviceIds?: string[];
      };

      if (data.action === 'subscribe_device' && data.deviceId) {
        meta.subscribedDevices.add(data.deviceId);
        ws.send(JSON.stringify({ status: 'subscribed', deviceId: data.deviceId }));
      } else if (data.action === 'unsubscribe_device' && data.deviceId) {
        meta.subscribedDevices.delete(data.deviceId);
        ws.send(JSON.stringify({ status: 'unsubscribed', deviceId: data.deviceId }));
      } else if (data.action === 'ping') {
        ws.send(JSON.stringify({ action: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch {
      // Ignore unparseable client messages
    }
  }

  public markAlive(ws: WebSocket): void {
    const meta = this.clients.get(ws);
    if (meta) {
      meta.isAlive = true;
    }
  }

  public getActiveCount(): number {
    return this.clients.size;
  }

  public getConnectedClients(): Map<WebSocket, ClientMeta> {
    return this.clients;
  }
}

export const wsHub = new WebSocketHub();

