import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config.js';
import { verifyUserOrganizationMembership, pool } from './db.js';
import { wsHub } from './hub.js';
import { redisSubscriber } from './redis.js';

const DEMO_USER_ID = '00000000-0000-4000-b000-000000000001';

const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'websocket-gateway',
        activeConnections: wsHub.getActiveCount(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    const orgId = url.searchParams.get('org_id') || (request.headers['x-kiot-organization-id'] as string);
    const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '');

    // 1. Verify Organization Header / Param exists
    if (!orgId) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\nMissing org_id parameter or header\r\n');
      socket.destroy();
      return;
    }

    // 2. Resolve User
    let userId = DEMO_USER_ID;
    if (token && token.startsWith('user_')) {
      userId = token.replace('user_', '');
    }

    // 3. Verify Membership in Organization
    const { isValid, role } = await verifyUserOrganizationMembership(userId, orgId);

    if (!isValid) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\nUnauthorized organization context\r\n');
      socket.destroy();
      return;
    }

    // 4. Upgrade connection
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, { userId, organizationId: orgId, role: role || 'viewer' });
    });
  } catch (error) {
    console.error('[WS Gateway Upgrade Error]:', error);
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, _request: http.IncomingMessage, meta: { userId: string; organizationId: string; role: string }) => {
  wsHub.addClient(ws, meta);

  // Send initial welcome state
  ws.send(
    JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      organizationId: meta.organizationId,
      userId: meta.userId,
      role: meta.role,
      timestamp: new Date().toISOString(),
    })
  );

  ws.on('message', (data) => {
    wsHub.handleClientMessage(ws, data.toString());
  });

  ws.on('pong', () => {
    wsHub.markAlive(ws);
  });

  ws.on('close', () => {
    wsHub.removeClient(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS Socket Error]:', err.message);
    wsHub.removeClient(ws);
  });
});

// Periodic Heartbeat to detect dead sockets
const heartbeatInterval = setInterval(() => {
  for (const [ws, meta] of wsHub.getConnectedClients()) {
    if (!meta.isAlive) {
      console.log(`[WS Heartbeat] Terminating inactive socket for user ${meta.userId}`);
      ws.terminate();
      continue;
    }
    meta.isAlive = false;
    ws.ping();
  }
}, config.HEARTBEAT_INTERVAL_MS);

server.listen(config.WS_PORT, config.HOST, () => {
  console.log(`
==================================================================
🚀 KIOT WebSocket Gateway Started Successfully!
==================================================================
  • WebSocket URL:   ws://localhost:${config.WS_PORT}
  • Health Endpoint: http://localhost:${config.WS_PORT}/health
  • Redis Backplane: ${config.REDIS_URL}
  • Heartbeat Rate:  ${config.HEARTBEAT_INTERVAL_MS / 1000}s
==================================================================
`);
});

// Graceful Shutdown
async function shutdown(): Promise<void> {
  console.log('\n[WS Gateway] Gracefully shutting down...');
  clearInterval(heartbeatInterval);

  wss.close(() => {
    console.log('[WS Gateway] WebSocket server closed.');
  });

  server.close(async () => {
    console.log('[WS Gateway] HTTP server closed.');
    await pool.end();
    redisSubscriber.disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

