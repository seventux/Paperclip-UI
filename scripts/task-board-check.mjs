// Task Board drag & drop verification via CDP.
// Usage: node scripts/task-board-check.mjs <debugPort>
// Requires: vite dev server on :3101 + Chrome headless with remote debugging
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
    if (r.result?.exceptionDetails) {
      throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails))
    }
    return r.result?.result?.value
  }

  await send('Runtime.enable')
  await send('Page.enable')
  // Desktop-sized viewport so the 4-column grid fits without scrolling
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url: 'http://127.0.0.1:3101/' })
  await new Promise((r) => setTimeout(r, 5000))

  const results = []
  const check = (name, pass, detail = '') => {
    results.push({ name, pass })
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  }

  const getCenter = (elementJs) =>
    evalJs(`(() => {
      const el = ${elementJs}
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
    })()`)

  const drag = async (from, to) => {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: from.x,
      y: from.y,
    })
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: from.x,
      y: from.y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    })
    const steps = 12
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(from.x + ((to.x - from.x) * i) / steps)
      const y = Math.round(from.y + ((to.y - from.y) * i) / steps)
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x,
        y,
        button: 'left',
        buttons: 1,
      })
      await new Promise((r) => setTimeout(r, 25))
    }
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: to.x,
      y: to.y,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    })
    await new Promise((r) => setTimeout(r, 700))
  }

  // Column body (droppable task list) lookup by header label
  const columnBodyJs = (label) => `(() => {
    const header = [...document.querySelectorAll('.glass-strong')].find((d) =>
      [...d.querySelectorAll('span')].some((s) => (s.textContent || '').trim() === '${label}')
    )
    return header ? header.parentElement.children[1] : null
  })()`

  // Open the task board (key 3)
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))`)
  await new Promise((r) => setTimeout(r, 1200))

  check(
    'task board opened',
    await evalJs(`document.body.textContent.includes('Task Board')`)
  )
  check(
    'agent dock visible',
    await evalJs(`document.body.textContent.includes('Drop to assign')`)
  )
  check(
    'four columns present',
    await evalJs(
      `['To Do', 'In Progress', 'Review', 'Done'].every((l) => document.body.textContent.includes(l))`
    )
  )

  const taskTitleJs = `[...document.querySelectorAll('p')].find((p) =>
    (p.textContent || '').trim() === 'Launch Q3 marketing campaign'
  )`

  // --- Drag task from In Progress → Done column ---
  const from = await getCenter(taskTitleJs)
  const doneCenter = await getCenter(columnBodyJs('Done'))
  check('task card found', Boolean(from && doneCenter))
  if (from && doneCenter) {
    await drag(from, doneCenter)
    check(
      'task moved to Done column',
      await evalJs(`(() => {
        const body = ${columnBodyJs('Done')}
        return body ? body.textContent.includes('Launch Q3 marketing campaign') : false
      })()`)
    )
    check(
      'task removed from In Progress column',
      await evalJs(`(() => {
        const body = ${columnBodyJs('In Progress')}
        return body ? !body.textContent.includes('Launch Q3 marketing campaign') : false
      })()`)
    )
  }

  // --- Drag task onto the Blaze agent chip to reassign ---
  const chipCenter = await getCenter(`(() => {
    const span = [...document.querySelectorAll('span')].find((s) =>
      (s.textContent || '').trim() === 'Blaze' && s.className.includes('text-[11px]')
    )
    return span ? span.parentElement : null
  })()`)
  const taskCenter = await getCenter(taskTitleJs)
  check('agent chip found', Boolean(chipCenter && taskCenter))
  if (chipCenter && taskCenter) {
    await drag(taskCenter, chipCenter)
    const cardText = await evalJs(`(() => {
      const p = ${taskTitleJs}
      if (!p) return ''
      const card = p.closest('[class*="cursor-grab"]') || p.parentElement
      return card ? card.textContent : ''
    })()`)
    check(
      'task reassigned to Blaze',
      cardText.includes('Blaze') && !cardText.includes('Nova'),
      cardText.replace(/\s+/g, ' ').trim().slice(0, 90)
    )
  }

  const failed = results.filter((r) => !r.pass).length
  console.log(
    failed === 0
      ? '\n✅ ALL TASK BOARD CHECKS PASSED'
      : `\n❌ ${failed} check(s) failed`
  )
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('check error:', err.message)
  process.exit(1)
})
