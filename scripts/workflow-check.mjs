// Workflow Pipeline verification via CDP.
// Usage: node scripts/workflow-check.mjs <debugPort>
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
  const clickByText = (text, tag = 'button') =>
    evalJs(`(() => {
      const el = [...document.querySelectorAll('${tag}')].find((e) =>
        (e.textContent || '').trim() === ${JSON.stringify(text)}
      )
      if (!el) return false
      el.click()
      return true
    })()`)
  const clickTemplate = (name) =>
    evalJs(`(() => {
      const el = [...document.querySelectorAll('button')].find((b) =>
        (b.textContent || '').trim().startsWith(${JSON.stringify(name)})
      )
      if (!el) return false
      el.click()
      return true
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

  // Open the workflow view (key 2)
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))`)
  await sleep(1200)

  // --- 1. Default template renders ---
  check(
    'workflow view opened',
    await evalJs(`document.body.textContent.includes('Workflow Pipeline')`)
  )
  check(
    'default Heartbeat Monitor steps render',
    await evalJs(
      `['Heartbeat Trigger', 'Budget Check', 'Execute Agent Task', 'Log Activity']
        .every((l) => document.body.textContent.includes(l))`
    )
  )

  // --- 2. Templates: load Budget Alert with branches ---
  check('templates button found', await clickByText('Templates'))
  await sleep(400)
  check('template dropdown opens', await clickTemplate('Budget Alert'))
  await sleep(800)
  check(
    'Budget Alert template loaded',
    await evalJs(
      `['Budget Threshold', 'Spend Check', 'Notify CFO', 'Send Alert', 'Log Normal Spend']
        .every((l) => document.body.textContent.includes(l))`
    )
  )
  check(
    'branch badges visible (Yes/No)',
    await evalJs(`document.body.textContent.includes('✓ Yes') && document.body.textContent.includes('✗ No')`)
  )

  // --- 3. Configure a step: error policy = stop + simulate failure ---
  check(
    'step card clickable',
    await evalJs(`(() => {
      const p = [...document.querySelectorAll('p')].find((p) =>
        (p.textContent || '').trim() === 'Notify CFO'
      )
      if (!p) return false
      p.click()
      return true
    })()`)
  )
  await sleep(600)
  check(
    'config panel opens',
    await evalJs(`document.body.textContent.includes('Step Config')`)
  )
  check('error policy buttons present', await clickByText('stop'))
  await sleep(300)
  check(
    'simulate failure toggle found',
    await evalJs(`(() => {
      const label = [...document.querySelectorAll('label')].find((l) =>
        (l.textContent || '').includes('Simulate failure')
      )
      if (!label) return false
      label.click()
      return true
    })()`)
  )
  await sleep(300)
  check(
    'simulate failure toggle checked',
    await evalJs(`[...document.querySelectorAll('input[type=checkbox]')].some((i) => i.checked)`)
  )

  // --- 4. Run: workflow should abort on the simulated error ---
  check('run button found', await clickByText('Run'))
  await sleep(7000)
  check(
    'execution log has entries',
    await evalJs(`document.body.textContent.includes('Run started')`)
  )
  check(
    'error logged for Notify CFO',
    await evalJs(`document.body.textContent.includes('Failed (simulated error')`)
  )
  check(
    'aborted by stop policy',
    await evalJs(`document.body.textContent.includes('Aborted by "stop" error policy')`)
  )
  check(
    'downstream step skipped',
    await evalJs(`document.body.textContent.includes('Skipped — workflow aborted by error policy')`)
  )
  check(
    'run finished (button back to Run)',
    await evalJs(`(() => {
      const b = [...document.querySelectorAll('button')].find((b) =>
        (b.textContent || '').trim() === 'Run'
      )
      return Boolean(b)
    })()`)
  )

  // --- 5. Save to localStorage ---
  check('save button found', await clickByText('Save'))
  await sleep(400)
  check(
    'workflow persisted to localStorage',
    await evalJs(`(() => {
      const raw = localStorage.getItem('paperclip-workflow')
      return raw ? raw.includes('Notify CFO') : false
    })()`)
  )

  // --- 6. Reset restores the default template ---
  check(
    'reset button found',
    await evalJs(`(() => {
      const b = [...document.querySelectorAll('button')].find((b) =>
        b.title === 'Reset to default'
      )
      if (!b) return false
      b.click()
      return true
    })()`)
  )
  await sleep(800)
  check(
    'localStorage cleared after reset',
    await evalJs(`localStorage.getItem('paperclip-workflow') === null`)
  )
  check(
    'default template restored',
    await evalJs(`document.body.textContent.includes('Heartbeat Trigger')`)
  )

  const failed = results.filter((r) => !r.pass).length
  console.log(
    failed === 0
      ? '\n✅ ALL WORKFLOW CHECKS PASSED'
      : `\n❌ ${failed} check(s) failed`
  )
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('check error:', err.message)
  process.exit(1)
})
