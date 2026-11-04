import { buildApp } from './app.js';
import { config } from './config.js';

async function startServer(): Promise<void> {
  try {
    const app = await buildApp();

    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });

    console.log(`
==================================================================
🚀 KIOT REST API Service Started Successfully!
==================================================================
  • Server URL:      http://localhost:${config.PORT}
  • Swagger Docs:    http://localhost:${config.PORT}/docs
  • Health Endpoint: http://localhost:${config.PORT}/health
  • Environment:     ${config.APP_ENV}
==================================================================
`);
  } catch (error) {
    console.error('[API Startup Fatal Error]:', error);
    process.exit(1);
  }
}

void startServer();

