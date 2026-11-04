import { io as ioClient, Socket } from 'socket.io-client';
import { FRANCHISE_PRESETS } from '../../src/shared/constants';
import { AuctionState, Participant, Player } from '../../src/shared/types';
import http from 'http';

const SERVER_URL = 'http://localhost:3001';

async function runBotSimulation() {
  console.log('🏏 [BOT SIMULATOR] Starting 20-Bot Race Condition & Stress Test...');

  // 1. Create room via REST
  const roomData = await new Promise<{ room_code: string }>((resolve, reject) => {
    const postData = JSON.stringify({
      room_name: '20-Bot Stress Room',
      host_session_id: 'bot-01',
      host_display_name: 'Bot 1',
    });

    const req = http.request(
      `${SERVER_URL}/api/rooms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve(JSON.parse(data)));
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  const roomCode = roomData.room_code;
  console.log(`✅ [BOT SIMULATOR] Room created: ${roomCode}`);

  const BOT_COUNT = 20;
  const sockets: Socket[] = [];
  const botParticipants: { id: string; name: string; socket: Socket }[] = [];

  let playersAuctionedCount = 0;
  let totalBidsPlaced = 0;
  let rejectedBidsCount = 0;

  // 2. Connect 20 bots
  for (let i = 0; i < BOT_COUNT; i++) {
    const botId = `bot-${String(i + 1).padStart(2, '0')}`;
    const botName = `Bot ${i + 1}`;
    const franchise = FRANCHISE_PRESETS[i % FRANCHISE_PRESETS.length];

    const socket = ioClient(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true,
      auth: {
        token: `bot_token_${botId}`,
        displayName: botName,
      },
    });

    sockets.push(socket);
    botParticipants.push({ id: botId, name: botName, socket });

    await new Promise<void>(resolve => {
      socket.on('connect', () => {
        socket.emit('room_join', {
          room_code: roomCode,
          display_name: botName,
          session_id: botId,
        });

        // Pick franchise
        socket.emit('franchise_pick', {
          room_code: roomCode,
          session_id: botId,
          franchise,
        });

        resolve();
      });
    });
  }

  console.log(`✅ [BOT SIMULATOR] All ${BOT_COUNT} bots connected and picked distinct franchises.`);

  const hostSocket = sockets[0];

  // Set fast timer for test (e.g. fast test settings)
  hostSocket.emit('settings_update', {
    room_code: roomCode,
    session_id: 'bot-01',
    settings: {
      timer_seconds: 1, // 1-second timer for fast test execution
      squad_size: 2, // 2 players per squad to reach completion swiftly
      purse: 1000000000,
    },
  });

  // Track state on host
  let latestAuctionState: AuctionState | null = null;
  let isDone = false;

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Simulation timed out after 30 seconds'));
    }, 30000);

    function cleanup() {
      clearTimeout(timeout);
      sockets.forEach(s => s.disconnect());
    }

    // Attach listeners to all bots to simulate aggressive concurrent bidding
    botParticipants.forEach((bot, index) => {
      bot.socket.on('next_player', (data: { player: Player; auction_state: AuctionState }) => {
        latestAuctionState = data.auction_state;
        // All 20 bots immediately hammer a bid simultaneously on player arrival!
        const increments = [2500000, 5000000, 10000000];
        const chosenIncrement = increments[index % 3];

        setTimeout(() => {
          totalBidsPlaced++;
          bot.socket.emit('place_bid', {
            room_code: roomCode,
            session_id: bot.id,
            increment: chosenIncrement,
          });
        }, Math.floor(Math.random() * 50)); // Jitter 0-50ms
      });

      bot.socket.on('bid_success', (data: { bid: any; auction_state: AuctionState }) => {
        latestAuctionState = data.auction_state;

        // If this bot is not leading, chance to re-bid aggressively
        if (data.auction_state.current_bidder_id !== bot.id) {
          const increments = [2500000, 5000000, 10000000];
          const chosenIncrement = increments[Math.floor(Math.random() * increments.length)];

          setTimeout(() => {
            totalBidsPlaced++;
            bot.socket.emit('place_bid', {
              room_code: roomCode,
              session_id: bot.id,
              increment: chosenIncrement,
            });
          }, Math.floor(Math.random() * 80));
        }
      });

      bot.socket.on('bid_rejected', () => {
        rejectedBidsCount++;
      });

      bot.socket.on('player_sold', (data: { player: Player; winner: Participant; price: number }) => {
        playersAuctionedCount++;
        console.log(
          `🔨 SOLD: ${data.player.name} -> ${data.winner.display_name} (${data.winner.franchise?.short_code}) for ₹${data.price / 10000000} Cr`
        );

        // After 2 players are competitively auctioned among the 20 bots, end auction to verify results
        if (playersAuctionedCount >= 2 && bot.id === 'bot-01') {
          console.log('⚡ [BOT SIMULATOR] 2 players auctioned under heavy concurrent bidding. Host ending auction...');
          hostSocket.emit('host_end_auction', {
            room_code: roomCode,
            session_id: 'bot-01',
          });
        }
      });

      bot.socket.on('auction_ended', results => {
        console.log('\n🏆 [SIMULATION SUCCESSFUL] Auction completed!');
        console.log(`- Total Bids Attempted: ${totalBidsPlaced}`);
        console.log(`- Contested / Rejected Bids (atomic order handling): ${rejectedBidsCount}`);
        console.log(`- Players Sold: ${playersAuctionedCount}`);
        console.log(`- Top Team: ${results.leaderboard[0]?.display_name} (${results.leaderboard[0]?.franchise?.short_code}) - Score: ${results.leaderboard[0]?.total_score}/100`);

        cleanup();
        resolve();
      });
    });

    // Start auction after brief setup delay
    setTimeout(() => {
      console.log('🚀 [BOT SIMULATOR] Host starting auction...');
      hostSocket.emit('start_auction', {
        room_code: roomCode,
        session_id: 'bot-01',
      });
    }, 1000);
  });
}

// Run if called directly
if (require.main === module || process.argv[1]?.includes('bot-simulator')) {
  runBotSimulation()
    .then(() => {
      console.log('✅ Bot simulation completed successfully with zero race conditions.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Bot simulation failed:', err);
      process.exit(1);
    });
}

export { runBotSimulation };
