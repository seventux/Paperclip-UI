// Desktop-layout sanity check via CDP. Usage: node scripts/desktop-check.mjs <debugPort>
const port = process.argv[2] || '9222'

async function main() {
  const target = await fetch(
    `http://127.0.0.1:${port}/json/new?http://127.0.0.1:3101/`,
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
  await new Promise((r) => setTimeout(r, 6000))

  const results = []
  const check = (name, pass) => {
    results.push({ name, pass })
    console.log(`${pass ? '✅' : '❌'} ${name}`)
  }

  const visible = (sel) =>
    evalJs(`(() => {
      const el = document.querySelector(${JSON.stringify(sel)})
      return !!el && getComputedStyle(el).display !== 'none'
    })()`)

  // Hero screen (skip it via keyboard '1')
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))`)
  await new Promise((r) => setTimeout(r, 700))

  check('hamburger hidden on desktop', !(await visible('[aria-label="Open navigation"]')))
  check(
    'sidebar visible on desktop',
    await evalJs(`(() => {
      const s = [...document.querySelectorAll('aside')].find((a) =>
        (a.textContent || '').includes('Overview')
      )
      return !!s && getComputedStyle(s).display !== 'none'
    })()`)
  )
  check(
    'search input visible on desktop',
    await evalJs(`(() => {
      const input = document.getElementById('global-search')
      if (!input) return false
      return getComputedStyle(input.closest('.max-w-md')).display !== 'none'
    })()`)
  )
  check(
    'right panel visible on desktop',
    await evalJs(`(() => {
      const pool = [...document.querySelectorAll('div')].find((d) =>
        (d.textContent || '').includes('All Agents')
      )
      return !!pool
    })()`)
  )
  check(
    'org chart fits without horizontal scroll on desktop',
    await evalJs(`(() => {
      const scroller = [...document.querySelectorAll('div')].find((d) => {
        const cls = String(d.className || '')
        return cls.includes('overflow-auto') &&
          (d.textContent || '').includes('Organization Chart')
      })
      return !!scroller && scroller.scrollWidth <= scroller.clientWidth + 1
    })()`)
  )

  const failed = results.filter((r) => !r.pass).length
  console.log(
    failed === 0
      ? '\n✅ ALL DESKTOP CHECKS PASSED'
      : `\n❌ ${failed} check(s) failed`
  )
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(() => process.exit(1))
