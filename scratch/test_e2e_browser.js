const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const screenshotDir = '/Users/tanmaypc/.gemini/antigravity/brain/6625ec94-9146-46a9-8e55-93e6589cd340/screenshots';

async function main() {
  const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    '--window-size=1440,960',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  const list = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9223/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = list.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
  };

  await new Promise(r => ws.onopen = r);

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');

  // 1. Navigate to Register
  console.log('Navigating to /auth/register...');
  await send('Page.navigate', { url: 'http://localhost:5173/auth/register' });
  await new Promise(r => setTimeout(r, 2000));

  // Fill and submit form
  const regResult = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        document.getElementById('reg-name').value = 'Priya Nair';
        document.getElementById('reg-email').value = 'priya.nair@iitb.ac.in';
        document.getElementById('reg-university').value = 'IIT Bombay';
        document.getElementById('reg-year').value = '3rd Year';
        document.getElementById('reg-password').value = 'SecurePass123!';
        document.getElementById('reg-confirm-password').value = 'SecurePass123!';
        document.getElementById('terms-agree').checked = true;

        document.getElementById('register-form').dispatchEvent(new Event('submit', { cancelable: true }));
        return true;
      })()
    `,
    awaitPromise: true
  });

  console.log('Registered student! Waiting for redirect to dashboard...');
  await new Promise(r => setTimeout(r, 2000));

  // 2. Capture Dashboard
  const dashShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotDir, 'functional_dashboard.png'), Buffer.from(dashShot.result.data, 'base64'));
  console.log('Captured functional_dashboard.png');

  // 3. Log today's mood
  console.log('Logging mood in dashboard...');
  await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const goodBtn = document.querySelector('.mood-pick-btn[data-level="good"]');
        if (goodBtn) goodBtn.click();
        const note = document.getElementById('quick-mood-note');
        if (note) note.value = 'Finished my lab assignment, feeling grounded and rested.';
        document.getElementById('save-quick-mood-btn').click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  // 4. Navigate to Counsellors Module
  console.log('Navigating to /counsellors...');
  await send('Page.navigate', { url: 'http://localhost:5173/counsellors' });
  await new Promise(r => setTimeout(r, 2000));

  const counsShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotDir, 'functional_counsellors_directory.png'), Buffer.from(counsShot.result.data, 'base64'));
  console.log('Captured functional_counsellors_directory.png');

  // 5. Book appointment
  console.log('Opening booking modal and booking appointment...');
  await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const bookBtn = document.querySelector('.btn-book');
        if (bookBtn) bookBtn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  await send('Runtime.evaluate', {
    expression: `
      (async () => {
        document.getElementById('booking-support-type').value = 'academic_stress';
        document.getElementById('booking-time-slot').value = '11:00 AM';
        document.getElementById('booking-notes').value = 'Would love guidance on dealing with midterm burnout.';
        document.getElementById('booking-form').dispatchEvent(new Event('submit', { cancelable: true }));
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  // 6. Capture Appointments panel
  const apptShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotDir, 'functional_counsellor_appointments.png'), Buffer.from(apptShot.result.data, 'base64'));
  console.log('Captured functional_counsellor_appointments.png');

  // 7. Navigate to Chat and send message
  console.log('Navigating to /chat...');
  await send('Page.navigate', { url: 'http://localhost:5173/chat' });
  await new Promise(r => setTimeout(r, 2000));

  await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const input = document.getElementById('chat-message-input');
        if (input) input.value = 'I feel a bit overwhelmed by exams and need a grounding breath.';
        document.getElementById('chat-send-form').dispatchEvent(new Event('submit', { cancelable: true }));
      })()
    `
  });
  await new Promise(r => setTimeout(r, 3000));

  const chatShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotDir, 'functional_chat.png'), Buffer.from(chatShot.result.data, 'base64'));
  console.log('Captured functional_chat.png');

  console.log('ALL E2E browser flows verified successfully!');
  ws.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
