// Quick mobile-layout verification via Chrome DevTools Protocol.
// Usage: node scripts/mobile-check.mjs <debugPort>
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
    if (r.result?.exceptionDetails) {
      throw new Error(JSON.stringify(r.result.exceptionDetails.exception))
    }
    return r.result?.result?.value
  }

  await send('Runtime.enable')
  await send('Page.enable')
  await new Promise((r) => setTimeout(r, 6000))

  const results = []
  const check = (name, pass, detail = '') => {
    results.push({ name, pass })
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  }

  const visible = (sel) =>
    evalJs(`(() => {
      const el = document.querySelector(${JSON.stringify(sel)})
      return !!el && getComputedStyle(el).display !== 'none'
    })()`)

  const clickByText = (text) =>
    evalJs(`(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        (b.textContent || '').trim() === ${JSON.stringify(text)}
      )
      if (btn) btn.click()
      return !!btn
    })()`)

  const openDrawerAndNav = async (label) => {
    await evalJs(`document.querySelector('[aria-label="Open navigation"]').click()`)
    await new Promise((r) => setTimeout(r, 600))
    await clickByText(label)
    await new Promise((r) => setTimeout(r, 700))
  }

  // 1. Header on mobile
  check('hamburger visible', await visible('[aria-label="Open navigation"]'))
  check(
    'search input hidden on mobile',
    await evalJs(`(() => {
      const input = document.getElementById('global-search')
      if (!input) return false
      const box = input.closest('.max-w-md')
      return !!box && getComputedStyle(box).display === 'none'
    })()`)
  )
  check('mobile search icon visible', await visible('[aria-label="Search"]'))

  // 2. Org view via drawer
  await openDrawerAndNav('Org Chart')
  check(
    'org chart visible after drawer nav',
    await evalJs(`document.body.textContent.includes('Organization Chart')`)
  )
  check(
    'org tree scrolls horizontally on mobile',
    await evalJs(`(() => {
      const scroller = [...document.querySelectorAll('div')].find((d) => {
        const cls = String(d.className || '')
        return cls.includes('overflow-auto') &&
          (d.textContent || '').includes('Organization Chart')
      })
      if (!scroller) return false
      return scroller.scrollWidth > scroller.clientWidth
    })()`)
  )

  // 3. Tasks view via drawer
  await openDrawerAndNav('Tasks')
  check(
    'task board visible after drawer nav',
    await evalJs(`document.body.textContent.includes('Task Board')`)
  )
  check(
    'task columns swipeable on mobile',
    await evalJs(`(() => {
      const scroller = [...document.querySelectorAll('div')].find((d) => {
        const cls = String(d.className || '')
        return cls.includes('overflow-x-auto')
      })
      if (!scroller) return false
      return scroller.scrollWidth > scroller.clientWidth
    })()`)
  )

  // 4. FAB visible on mobile
  check(
    'FAB visible on mobile',
    await evalJs(`(() => {
      const el = [...document.querySelectorAll('div')].find((d) =>
        String(d.className || '').includes('fixed bottom-6')
      )
      return !!el && getComputedStyle(el).display !== 'none'
    })()`)
  )

  const failed = results.filter((r) => !r.pass).length
  console.log(
    failed === 0
      ? '\n✅ ALL MOBILE CHECKS PASSED'
      : `\n❌ ${failed} check(s) failed`
  )
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('check error:', err.message || err)
  process.exit(1)
})
