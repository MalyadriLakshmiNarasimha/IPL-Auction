import { server, startServer } from '../index';
import { runBotSimulation } from './bot-simulator';

async function main() {
  await startServer(3001);
  console.log('[TEST RUNNER] Server listening on 3001, initiating bot simulation...');
  try {
    await runBotSimulation();
    console.log('[TEST RUNNER] Simulation passed! Closing server...');
    server.close(() => {
      process.exit(0);
    });
  } catch (err) {
    console.error('[TEST RUNNER] Simulation failed:', err);
    server.close(() => {
      process.exit(1);
    });
  }
}

main();
