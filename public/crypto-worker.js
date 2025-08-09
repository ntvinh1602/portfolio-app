let supabase;
let channel = null;

async function initialize(supabaseUrl, supabaseAnonKey) {
  console.log('Worker: Initializing Supabase client and channel.');
  // Dynamically import Supabase client
  if (!supabase) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  // Create the channel but don't subscribe yet
  channel = supabase
    .channel('crypto_price_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_securities_data',
        filter: 'symbol=eq.BTC',
      },
      (payload) => {
        self.postMessage(payload.new);
      }
    );
}

async function start() {
  if (!channel) return;
  console.log('Worker: Starting feed and subscribing to channel.');
  try {
    await fetch('/api/feed/crypto/start', { method: 'POST' });
    channel.subscribe();
    console.log('Worker: Start command successful.');
  } catch (error) {
    console.error('Worker: Error during start:', error);
  }
}

async function stop() {
  if (!channel) return;
  console.log('Worker: Stopping feed and unsubscribing from channel.');
  try {
    await fetch('/api/feed/crypto/stop', { method: 'POST' });
    channel.unsubscribe();
    console.log('Worker: Stop command successful.');
  } catch (error) {
    console.error('Worker: Error during stop:', error);
  }
}

self.onmessage = async (event) => {
  const { action, supabaseUrl, supabaseAnonKey } = event.data;
  console.log('Worker: Received action:', action);

  // Initialize on the very first message
  if (!supabase) {
    await initialize(supabaseUrl, supabaseAnonKey);
  }

  if (action === 'start') {
    await start();
  } else if (action === 'stop') {
    await stop();
  }
};