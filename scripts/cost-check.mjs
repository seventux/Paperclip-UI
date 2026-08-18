// Cost Analytics dashboard verification via CDP.
// Usage: node scripts/cost-check.mjs <debugPort>
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

  // Open the cost dashboard (key 4)
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }))`)
  await new Promise((r) => setTimeout(r, 1200))

  check(
    'cost dashboard opened',
    await evalJs(`document.body.textContent.includes('Cost Analytics')`)
  )

  check(
    'summary stats present',
    await evalJs(
      `['Total Spend', 'Tokens Used', 'Avg Daily Burn', 'Projected 30d Spend'].every((l) =>
        document.body.textContent.includes(l)
      )`
    )
  )

  check(
    'time-series chart rendered',
    await evalJs(`Boolean(document.querySelector('[data-cost-chart] svg'))`)
  )

  const agentRows = await evalJs(
    `document.querySelectorAll('[data-agent-row]').length`
  )
  const forecastRows = await evalJs(
    `document.querySelectorAll('[data-forecast-row]').length`
  )
  check('per-agent breakdown rows', agentRows >= 3, `${agentRows} rows`)
  check('forecast rows', forecastRows >= 3, `${forecastRows} rows`)

  // Period switching: weekly
  await evalJs(`document.querySelector('[data-period="weekly"]').click()`)
  await new Promise((r) => setTimeout(r, 800))
  check(
    'weekly period shows weekly label',
    await evalJs(
      `document.body.textContent.includes('Total Token Usage — Weekly')`
    )
  )

  // Monthly
  await evalJs(`document.querySelector('[data-period="monthly"]').click()`)
  await new Promise((r) => setTimeout(r, 800))
  check(
    'monthly period shows monthly label',
    await evalJs(
      `document.body.textContent.includes('Total Token Usage — Monthly')`
    )
  )

  // CSV export: stub createObjectURL + click, verify a download anchor fires
  const exportOk = await evalJs(`(() => {
    window.__dlName = null
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () { window.__dlName = this.download }
    document.querySelector('[data-export-csv]').click()
    HTMLAnchorElement.prototype.click = orig
    return window.__dlName
  })()`)
  check('CSV export triggers download', exportOk === 'paperclip-cost-report.csv', String(exportOk))

  const failed = results.filter((r) => !r.pass).length
  console.log(
    failed === 0
      ? '\n✅ ALL COST DASHBOARD CHECKS PASSED'
      : `\n❌ ${failed} check(s) failed`
  )
  ws.close()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('check error:', err.message)
  process.exit(1)
})
