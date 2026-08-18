// Agent Chat Interface verification via CDP.
// Usage: node scripts/chat-check.mjs <debugPort>
// Requires: vite dev server on :3101 + Chrome headless with remote debugging
const port = process.argv[2] || '9222'

async function main() {
  const target = await fetch(`http://127.0.0.1:${port}/json/new`, {
    method: 'PUT',
  }).then((r) => r.json())
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res) => (ws.onopen = res))

  let id = 0
  const pending = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    }
  }
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id
      pending.set(i, res)
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.result?.exceptionDetails) {
      throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails))
    }
    return r.result?.result?.value
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const bodyHas = (text) =>
    evalJs(`document.body.textContent.includes(${JSON.stringify(text)})`)

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url: 'http://127.0.0.1:3101/' })
  await sleep(4000)

  const results = []
  const check = (name, pass, detail = '') => {
    results.push({ name, pass })
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  }

  // --- 1. Open chat drawer via FAB → Quick Chat ---
  const fabOpened = await evalJs(`(() => {
    const fab = document.querySelector('[aria-label="Quick actions"]')
    if (!fab) return false
    fab.click()
    return true
  })()`)
  check('FAB opens quick actions', fabOpened)
  await sleep(400)
  const quickChatClicked = await evalJs(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes('Quick Chat')
    )
    if (!btn) return false
    btn.click()
    return true
  })()`)
  check('Quick Chat action available', quickChatClicked)
  await sleep(600)
  check('drawer opens with conversation list', await bodyHas('Conversations'))
  check('thread list shows agents', await bodyHas('Atlas') && await bodyHas('Nova'))

  // --- 2. Open a thread → empty state ---
  const threadOpened = await evalJs(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes('Atlas')
    )
    if (!btn) return false
    btn.click()
    return true
  })()`)
  check('thread opens for Atlas', threadOpened)
  await sleep(400)
  check('empty state shown', await bodyHas('Chat with Atlas'))
  check('message input present', await evalJs(`Boolean(document.querySelector('[data-chat-input]'))`))

  // --- 3. Send a message via the input + send button ---
  const typed = await evalJs(`(() => {
    const input = document.querySelector('[data-chat-input]')
    if (!input) return false
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set
    setter.call(input, 'hello Atlas, what is your status?')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  check('input accepts text', typed)
  await sleep(200)
  const sent = await evalJs(`(() => {
    const btn = document.querySelector('[data-chat-send]')
    if (!btn || btn.disabled) return false
    btn.click()
    return true
  })()`)
  check('send button enabled & clicked', sent)
  await sleep(400)
  check('user bubble appears', await bodyHas('hello Atlas, what is your status?'))
  check('tool call trace rendered', (await evalJs(`document.querySelectorAll('[data-chat-tool]').length`)) === 2)

  // --- 4. Tool calls resolve, then the agent reply lands ---
  check('tools running initially', (await evalJs(`document.querySelectorAll('[data-chat-tool] .animate-spin').length`)) >= 1)
  await sleep(2800)
  // "status" in the message triggers the status-aware reply
  check('agent reply appears', await bodyHas('All systems nominal'))
  check('no pending typing indicator', !(await bodyHas('typing…')))
  check('all tools succeeded', (await evalJs(`document.querySelectorAll('[data-chat-tool] svg.text-emerald-400').length`)) === 2)

  // --- 5. Clear conversation ---
  const cleared = await evalJs(`(() => {
    const btn = document.querySelector('[aria-label="Clear conversation"]')
    if (!btn) return false
    btn.click()
    return true
  })()`)
  check('clear conversation button works', cleared)
  await sleep(400)
  check('empty state after clear', await bodyHas('Chat with Atlas'))

  // --- 6. Agent detail integration: Chat button opens drawer for that agent ---
  await evalJs(`(() => {
    const btn = document.querySelector('[aria-label="Close chat"]')
    if (btn) btn.click()
    return true
  })()`)
  await sleep(400)
  const toOrg = await evalJs(`(() => {
    const fab = document.querySelector('[aria-label="Quick actions"]')
    if (!fab) return false
    fab.click()
    return true
  })()`)
  await sleep(300)
  await evalJs(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes('Org View')
    )
    if (btn) btn.click()
    return true
  })()`)
  await sleep(800)
  const openedAgent = await evalJs(`(() => {
    const card = [...document.querySelectorAll('div')].find((el) =>
      (el.textContent || '').includes('Atlas') &&
      (el.className || '').includes('cursor-grab')
    )
    if (!card) return false
    card.click()
    return true
  })()`)
  check('agent detail opens from org chart', openedAgent)
  await sleep(600)
  check('chat button on agent detail', await evalJs(`[...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Chat')`))
  await evalJs(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent || '').trim() === 'Chat'
    )
    if (btn) btn.click()
    return true
  })()`)
  await sleep(500)
  check('drawer opens from agent detail', await bodyHas('Chat with Atlas'))
  check('thread state persisted', await evalJs(`Boolean(document.querySelector('[data-chat-input]'))`))

  const failed = results.filter((r) => !r.pass).length
  console.log(
    failed === 0
      ? '\n✅ ALL AGENT CHAT CHECKS PASSED'
      : `\n❌ ${failed} check(s) failed`
  )
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('check error:', err.message)
  process.exit(1)
})
