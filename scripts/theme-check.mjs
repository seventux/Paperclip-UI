// Theme toggle verification via CDP. Usage: node scripts/theme-check.mjs <debugPort>
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
  // Emulate BEFORE navigating so matchMedia is correct at load time
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await send('Page.navigate', { url: 'http://127.0.0.1:3101/' })
  await new Promise((r) => setTimeout(r, 5000))

  const results = []
  const check = (name, pass, detail = '') => {
    results.push({ name, pass })
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  }

  // 1. Defaults to dark (system prefers dark)
  check(
    'defaults to dark theme',
    await evalJs(`!document.documentElement.classList.contains('light')`)
  )

  // 2. Toggle to light
  await evalJs(`document.querySelector('[aria-label="Toggle theme"]').click()`)
  await new Promise((r) => setTimeout(r, 400))
  const lightApplied = await evalJs(`(() => {
    const html = document.documentElement
    const bodyBg = getComputedStyle(document.body).backgroundImage
    const saved = localStorage.getItem('paperclip-theme')
    return {
      hasLight: html.classList.contains('light'),
      bodyLight: bodyBg.includes('245, 245, 249') || bodyBg.includes('#f1f5f9') || bodyBg.includes('241, 245, 249'),
      saved,
    }
  })()`)
  check('light class applied to <html>', lightApplied.hasLight)
  check('body background switched to light', lightApplied.bodyLight)
  check('preference persisted to localStorage', lightApplied.saved === 'light')

  // 3. Glass panel reflects light theme
  const glassBg = await evalJs(`(() => {
    const g = [...document.querySelectorAll('.glass-strong')].find((el) => getComputedStyle(el).display !== 'none')
    return g ? getComputedStyle(g).backgroundColor : ''
  })()`)
  check('glass panel is light (semi-transparent white)', /rgba\(255, 255, 255/.test(glassBg), glassBg)

  // 4. Reload keeps light theme
  await send('Page.reload')
  await new Promise((r) => setTimeout(r, 5000))
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  check(
    'theme persists after reload',
    await evalJs(`document.documentElement.classList.contains('light')`)
  )

  // 5. Toggle back to dark
  await evalJs(`document.querySelector('[aria-label="Toggle theme"]').click()`)
  await new Promise((r) => setTimeout(r, 400))
  const darkBack = await evalJs(`(() => {
    const html = document.documentElement
    const bodyBg = getComputedStyle(document.body).backgroundImage
    return {
      hasLight: html.classList.contains('light'),
      bodyDark: bodyBg.includes('10, 10, 26') || bodyBg.includes('#0a0a1a') || bodyBg.includes('10, 10, 26'),
      saved: localStorage.getItem('paperclip-theme'),
    }
  })()`)
  check('toggle back to dark', !darkBack.hasLight && darkBack.bodyDark)
  check('dark preference persisted', darkBack.saved === 'dark')

  // 6. System preference fallback (fresh profile, no saved pref)
  await evalJs(`localStorage.removeItem('paperclip-theme')`)
  await send('Page.reload')
  await new Promise((r) => setTimeout(r, 4000))
  check(
    'falls back to system light preference',
    await evalJs(`document.documentElement.classList.contains('light')`)
  )

  // 7. Light-mode readability sanity (we are in light theme now)
  const readable = await evalJs(`(() => {
    const grad = document.querySelector('.hero-gradient')
    const gradStyle = grad ? getComputedStyle(grad) : null
    const heading = document.querySelector('h1')
    const headingColor = heading ? getComputedStyle(heading).color : ''
    return {
      hasGrad: !!gradStyle && gradStyle.backgroundImage.includes('linear-gradient'),
      headingDark: headingColor === 'rgb(30, 41, 59)',
      bodyText: getComputedStyle(document.body).color,
    }
  })()`)
  check('hero gradient renders in light mode', readable.hasGrad)
  check('heading text is dark in light mode', readable.headingDark, readable.headingColor)
  check('body text is dark in light mode', readable.bodyText === 'rgb(30, 41, 59)', readable.bodyText)

  const failed = results.filter((r) => !r.pass).length
  console.log(
    failed === 0
      ? '\n✅ ALL THEME CHECKS PASSED'
      : `\n❌ ${failed} check(s) failed`
  )
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('check error:', err.message)
  process.exit(1)
})
