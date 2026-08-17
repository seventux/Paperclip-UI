// Notifications System verification via CDP.
// Usage: node scripts/notifications-check.mjs <debugPort>
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
  const badgeText = () =>
    evalJs(`(() => {
      const btn = document.querySelector('[aria-label="Notifications"]')
      if (!btn) return null
      const span = btn.querySelector('span')
      return span ? span.textContent.trim() : null
    })()`)

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
  const openPanel = () =>
    evalJs(`(() => {
      const btn = document.querySelector('[aria-label="Notifications"]')
      if (!btn) return false
      const isOpen =
        Boolean(document.querySelector('[title="Mark all as read"]')) ||
        document.body.textContent.includes('No notifications yet.')
      if (!isOpen) btn.click()
      return true
    })()`)

  // --- 1. Bell button + seeded unread badge ---
  check('bell button present', await evalJs(`Boolean(document.querySelector('[aria-label="Notifications"]'))`))
  check('unread badge shows 1', (await badgeText()) === '1', `badge="${await badgeText()}"`)

  // --- 2. Open panel: seeded notifications render ---
  check('panel opens', await openPanel())
  await sleep(500)
  check('welcome notification visible', await bodyHas('Welcome to Paperclip'))
  check('task notification visible', await bodyHas('Task completed: SEO audit and optimization'))

  // --- 3. Click a notification → marked as read ---
  await evalJs(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes('Welcome to Paperclip')
    )
    if (!btn) return false
    btn.click()
    return true
  })()`)
  await sleep(400)
  check('badge cleared after reading', (await badgeText()) === null, `badge="${await badgeText()}"`)

  // --- 4. Clear all → empty state ---
  await evalJs(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.title === 'Clear all'
    )
    if (!btn) return false
    btn.click()
    return true
  })()`)
  await sleep(400)
  check('empty state after clear', await bodyHas('No notifications yet.'))

  // --- 5. Drive realtime events through the store (dev hook) ---
  const dispatched = await evalJs(`(() => {
    const store = window.__useStore
    if (!store) return { ok: false, reason: 'no store hook' }
    const s = store.getState()

    // Agent status change (toggle to the opposite of the current status)
    const ceo = s.employees.ceo
    const target = ceo.status === 'active' ? 'idle' : 'active'
    s.applyRealtimeEvent({ type: 'agent_status', agentId: 'ceo', status: target, timestamp: Date.now() })

    // Budget warning: reset below 80% then cross it
    const analyst = s.employees.analyst
    s.updateEmployeeTokens('analyst', Math.floor(analyst.budget * 0.5))
    s.applyRealtimeEvent({ type: 'token_usage', agentId: 'analyst', tokensUsed: Math.floor(analyst.budget * 0.9), timestamp: Date.now() })

    // Task completion: pick a non-done task and mark it done
    const task = s.tasks.find((t) => t.status !== 'done')
    if (!task) return { ok: false, reason: 'no pending task' }
    s.applyRealtimeEvent({ type: 'task_update', taskId: task.id, status: 'done', timestamp: Date.now() })

    return { ok: true, statusTarget: target, taskTitle: task.title }
  })()`)
  check('store dev hook available', dispatched?.ok === true, dispatched?.reason || '')
  await sleep(500)

  check('badge shows 3 unread', (await badgeText()) === '3', `badge="${await badgeText()}"`)

  // --- 6. Generated notifications appear in the panel ---
  await openPanel()
  await sleep(500)
  check(
    'status change notification',
    await bodyHas(`Atlas is now ${dispatched.statusTarget}`)
  )
  check('budget warning notification', await bodyHas('Sage crossed 80% of budget'))
  check(
    'task completion notification',
    await bodyHas(`Task completed: ${dispatched.taskTitle}`)
  )

  // --- 7. Mark all as read ---
  await evalJs(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.title === 'Mark all as read'
    )
    if (!btn) return false
    btn.click()
    return true
  })()`)
  await sleep(400)
  check('badge gone after mark all read', (await badgeText()) === null, `badge="${await badgeText()}"`)

  const failed = results.filter((r) => !r.pass).length
  console.log(
    failed === 0
      ? '\n✅ ALL NOTIFICATIONS CHECKS PASSED'
      : `\n❌ ${failed} check(s) failed`
  )
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('check error:', err.message)
  process.exit(1)
})
