import { CONTRAST_CHECKS, DEFAULT_VISIBLE, PRESETS, contrast } from './presets'

const STORAGE_KEY = 'mwk-design-lab-v3'
const form = document.querySelector<HTMLFormElement>('#controls')!
const grid = document.querySelector<HTMLElement>('#grid')!
const filter = document.querySelector<HTMLElement>('#preset-filter')!

// 表示する案のチェックボックス（絞り込みはブラウザに保存）
let saved: Record<string, string | string[]> = {}
try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
} catch {
  // 保存領域が使えなくても動作する
}
const visible = new Set<string>(Array.isArray(saved.presets) ? saved.presets : DEFAULT_VISIBLE)
for (const p of PRESETS) {
  const label = document.createElement('label')
  label.innerHTML = `<input type="checkbox" name="preset" value="${p.id}" ${visible.has(p.id) ? 'checked' : ''} />${p.name}`
  filter.append(label)
}
for (const key of ['screen', 'scheme', 'width', 'bg'] as const) {
  const v = saved[key]
  if (typeof v === 'string') form.querySelector<HTMLInputElement>(`input[name=${key}][value=${v}]`)?.click()
}

function render() {
  const data = new FormData(form)
  const screen = String(data.get('screen'))
  const schemeSel = String(data.get('scheme'))
  const width = String(data.get('width'))
  const bg = String(data.get('bg'))
  const presets = data.getAll('preset').map(String)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen, scheme: schemeSel, width, bg, presets }))
  } catch {
    // 保存できなくてもよい
  }
  const schemes = schemeSel === 'both' ? ['light', 'dark'] : [schemeSel]
  const [w, h] = width === 'mobile' ? [375, 760] : [600, 760]
  grid.replaceChildren(
    ...PRESETS.filter((p) => presets.includes(p.id)).map((p) => {
      const section = document.createElement('section')
      section.className = 'lab-preset'
      const fails = (['light', 'dark'] as const).flatMap((s) =>
        CONTRAST_CHECKS.filter(([f, b, min]) => contrast(p[s][f], p[s][b]) < min).map(([f, b]) => `${s}: ${f}/${b}`),
      )
      section.innerHTML = `
        <h2>${p.name}</h2>
        <p class="lab-concept">${p.concept}</p>
        <p class="lab-contrast ${fails.length ? 'ng' : 'ok'}">${fails.length ? `コントラスト不足: ${fails.join(', ')}` : 'コントラスト基準を満たしています'}</p>
        <div class="lab-frames">${schemes
          .map(
            (s) =>
              `<figure><iframe loading="lazy" width="${w}" height="${h}" title="${p.name} ${s}" src="./frame.html?preset=${p.id}&scheme=${s}&screen=${screen}&bg=${bg}"></iframe><figcaption>${s === 'light' ? 'ライト' : 'ダーク'}</figcaption></figure>`,
          )
          .join('')}</div>`
      return section
    }),
  )
}

form.addEventListener('change', render)
render()
