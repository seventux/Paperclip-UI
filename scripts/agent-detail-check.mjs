// Agent Detail page verification via CDP. Usage: node scripts/agent-detail-check.mjs <debugPort>
const port = process.argv[2] || '9222'

async function main() {
  const target = await fetch(
    `http://127.0.0.1:${port}/json/new`,
    { method: 'PUT' }
  ).then((r) => r.json())
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
    if (r.result?.exceptionDetails) throw new Error('eval failed')
    return r.result?.result?.value
  }

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await send('Page.navigate', { url: 'http://127.0.0.1:3101/' })
  await new Promise((r) => setTimeout(r, 5000))

  const results = []
  const check = (name, pass, detail = '') => {
    results.push({ name, pass })
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  }

  // Enter org view
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))`)
  await new Promise((r) => setTimeout(r, 800))

  // Click the CEO card (Atlas) to open the detail page
  const opened = await evalJs(`(() => {
    const card = [...document.querySelectorAll('div')].find((d) =>
      (d.textContent || '').trim() === 'Atlas'
    )
    if (!card) return false
    const clickable = card.closest('[class*="cursor-grab"]') || card
    clickable.click()
    return true
  })()`)
  check('agent card found & clicked', opened)
  await new Promise((r) => setTimeout(r, 800))

  check(
    'detail page opened (Activity Log)',
    await evalJs(`document.body.textContent.includes('Activity Log')`)
  )
  check(
    'detail page shows agent name',
    await evalJs(`document.body.textContent.includes('Chief Executive Officer')`)
  )
  check(
    'task assignments section',
    await evalJs(`document.body.textContent.includes('Task Assignments')`)
  )
  check(
    'budget settings section',
    await evalJs(`document.body.textContent.includes('Budget Settings')`)
  )
  check(
    'heartbeat schedule section',
    await evalJs(`document.body.textContent.includes('Heartbeat Schedule')`)
  )
  check(
    'token usage chart section',
    await evalJs(`document.body.textContent.includes('Token Usage')`)
  )

  // Budget save: set 600000, save, header should show 600K
  await evalJs(`(() => {
    const input = [...document.querySelectorAll('input[type="number"]')][0]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '600000')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await evalJs(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes('Save')
    )
    btn.click()
  })()`)
  await new Promise((r) => setTimeout(r, 500))
  check(
    'budget save updates display (600K total)',
    await evalJs(`document.body.textContent.includes('600K tokens')`)
  )

  // Esc returns to org chart
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
  await new Promise((r) => setTimeout(r, 700))
  check(
    'Esc returns to org chart',
    await evalJs(`document.body.textContent.includes('Organization Chart')`)
  )

  // Reopen and confirm live heartbeats append to activity
  await evalJs(`(() => {
    const card = [...document.querySelectorAll('div')].find((d) =>
      (d.textContent || '').trim() === 'Atlas'
    )
    const clickable = card ? card.closest('[class*="cursor-grab"]') || card : null
    if (clickable) clickable.click()
  })()`)
  await new Promise((r) => setTimeout(r, 800))
  const beatCount1 = await evalJs(`(document.body.textContent.match(/just now/g) || []).length`)
  await new Promise((r) => setTimeout(r, 7000))
  const beatCount2 = await evalJs(`(document.body.textContent.match(/just now/g) || []).length`)
  check(
    'live heartbeats append to activity timeline',
    beatCount2 > beatCount1,
    `before=${beatCount1} after=${beatCount2}`
  )

  const failed = results.filter((r) => !r.pass).length
  console.log(
    failed === 0
      ? '\n✅ ALL AGENT DETAIL CHECKS PASSED'
      : `\n❌ ${failed} check(s) failed`
  )
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('check error:', err.message)
  process.exit(1)
})
