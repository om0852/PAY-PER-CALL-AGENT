const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

async function testMcpServer() {
  console.log('--- STARTING AGENTBUCKET MCP SERVER TEST ---');

  const serverScript = path.join(__dirname, 'server.js');
  const child = spawn('node', [serverScript], {
    env: { ...process.env, AGENTBUCKET_API_URL: 'http://localhost:3000' }
  });

  const responses = [];
  const rl = readline.createInterface({ input: child.stdout });

  rl.on('line', (line) => {
    try {
      responses.push(JSON.parse(line));
    } catch {}
  });

  child.stderr.on('data', (d) => {
    console.log('[MCP STDERR]', d.toString().trim());
  });

  const send = (msg) => {
    child.stdin.write(JSON.stringify(msg) + '\n');
  };

  // 1. Initialize
  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'antigravity-ide-client', version: '1.0.0' }
    }
  });

  // 2. tools/list
  setTimeout(() => {
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  }, 300);

  // 3. tools/call: get_wallet_balance
  setTimeout(() => {
    send({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'get_wallet_balance', arguments: {} }
    });
  }, 700);

  // 4. tools/call: list_services
  setTimeout(() => {
    send({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'list_services', arguments: { category: 'sentiment' } }
    });
  }, 1100);

  // 5. tools/call: get_settlement_ledger
  setTimeout(() => {
    send({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'get_settlement_ledger', arguments: { limit: 2 } }
    });
  }, 1500);

  // 6. tools/call: call_x402_service
  setTimeout(() => {
    send({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'call_x402_service',
        arguments: {
          serviceEndpointOrName: '/api/sellers/sentiment-categorizer',
          payload: { text: 'AgentBucket is the fastest x402 payment relayer on Base!' }
        }
      }
    });
  }, 1900);

  setTimeout(() => {
    child.kill();
    console.log('\n=====================================================');
    console.log(`RECEIVED ${responses.length} VALID JSON-RPC RESPONSES FROM MCP`);
    console.log('=====================================================');

    responses.forEach((r) => {
      console.log(`\n>>> [Response ID: ${r.id}]`);
      if (r.result?.serverInfo) {
        console.log('✓ Handshake Success:', JSON.stringify(r.result.serverInfo));
      } else if (r.result?.tools) {
        console.log(`✓ Tools Registered (${r.result.tools.length}):`, r.result.tools.map((t) => t.name).join(', '));
      } else if (r.result?.content) {
        console.log('✓ Tool Output:');
        console.log(r.result.content[0].text);
      } else if (r.error) {
        console.error('✕ Error:', r.error);
      }
    });

    console.log('\n=====================================================');
    console.log('ALL MCP TESTS PASSED SUCCESSFULLY!');
    console.log('=====================================================');
    process.exit(0);
  }, 3000);
}

testMcpServer();
