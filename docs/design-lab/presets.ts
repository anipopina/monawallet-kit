// デザイン検討で作ったトークンセット（参考資料）。採用案は src/vue/styles.css の既定値になっている。
// どの案も --mwk-* トークンの上書きだけで表現しており、アプリ側のCSSで .mwk-root に同じ値を指定すれば再現できる。

export type ColorTokens = {
  bg: string
  surface: string
  fg: string
  muted: string
  border: string
  accent: string
  'accent-fg': string
  danger: string
  'danger-bg': string
  'warn-bg': string
  'warn-border': string
  success: string
  focus: string
}

export type ShapeTokens = {
  radius: string
  'radius-sm': string
  'modal-radius': string
  'btn-radius': string
  'input-radius': string
  'border-width': string
  'btn-shadow': string
  'modal-border': string
  'modal-shadow': string
  backdrop: string
  'backdrop-filter'?: string
}

export type Preset = {
  id: string
  name: string
  concept: string
  light: ColorTokens
  dark: ColorTokens
  shape: ShapeTokens
}

// MARK: 夜店の派生案と採用案

const YOMISE_LIGHT: ColorTokens = {
  bg: '#fbf8fc',
  surface: '#f1e9f3',
  fg: '#24132b',
  muted: '#5e4a66',
  border: '#dccbe0',
  accent: '#7b2c74',
  'accent-fg': '#ffffff',
  danger: '#b3263a',
  'danger-bg': '#fbe8ec',
  'warn-bg': '#fff1d6',
  'warn-border': '#e09b2d',
  success: '#2b7a4b',
  focus: '#c46a00',
}
const YOMISE_DARK: ColorTokens = {
  bg: '#1a1020',
  surface: '#26182e',
  fg: '#f6eaf7',
  muted: '#c7b0cc',
  border: '#3f2a48',
  accent: '#ffb04a',
  'accent-fg': '#1a1020',
  danger: '#ff8a9a',
  'danger-bg': '#3d1823',
  'warn-bg': '#3a2614',
  'warn-border': '#c98a2e',
  success: '#7fd8a0',
  focus: '#c99cff',
}
/** 提灯の縁：アクセント色を薄めた縁取りと、にじむ光。背後は暗くしてぼかす */
const LANTERN_SHAPE: ShapeTokens = {
  radius: '16px',
  'radius-sm': '10px',
  'modal-radius': '22px',
  'btn-radius': '999px',
  'input-radius': '12px',
  'border-width': '1px',
  'btn-shadow': 'none',
  'modal-border': '1px solid color-mix(in srgb, var(--mwk-accent) 45%, transparent)',
  'modal-shadow': '0 0 48px color-mix(in srgb, var(--mwk-accent) 22%, transparent), 0 24px 60px rgb(20 6 28 / 0.5)',
  backdrop: 'rgb(14 6 18 / 0.62)',
  'backdrop-filter': 'blur(4px)',
}

const YOMISE_VARIANTS: Preset[] = [
  {
    id: 'adopted',
    name: '採用案',
    concept: 'ダークは「夜店・明るい面」、ライトは「夜桜」の配色。形は夜店・明るい面（縁取りなし、背後を軽くぼかす）。',
    light: {
      ...YOMISE_LIGHT,
      bg: '#fffafc',
      surface: '#f8ecf2',
      fg: '#2a1525',
      muted: '#66485c',
      border: '#ecd3e0',
      accent: '#a3346f',
    },
    dark: { ...YOMISE_DARK, bg: '#2a1b33', surface: '#36243f', border: '#4f3759' },
    shape: {
      ...LANTERN_SHAPE,
      'modal-border': 'none',
      'modal-shadow': '0 24px 60px rgb(10 2 14 / 0.6)',
      backdrop: 'rgb(14 6 18 / 0.55)',
      'backdrop-filter': 'blur(2px)',
    },
  },
  {
    id: 'yomise-lantern',
    name: '夜店・提灯の縁',
    concept: '夜店をそのままに、モーダルの縁を提灯の光のように縁取る。背後のアプリは暗くぼかし、ダークでも浮き上がって見えるようにした。',
    light: YOMISE_LIGHT,
    dark: YOMISE_DARK,
    shape: LANTERN_SHAPE,
  },
  {
    id: 'yomise-lifted',
    name: '夜店・明るい面',
    concept: '縁取りは使わず、ダークのモーダル自体を一段明るい紫にして、暗いアプリ画面から面の明るさで区別する。背後は軽くぼかす。',
    light: YOMISE_LIGHT,
    dark: { ...YOMISE_DARK, bg: '#2a1b33', surface: '#36243f', border: '#4f3759' },
    shape: {
      ...LANTERN_SHAPE,
      'modal-border': 'none',
      'modal-shadow': '0 24px 60px rgb(10 2 14 / 0.6)',
      backdrop: 'rgb(14 6 18 / 0.55)',
      'backdrop-filter': 'blur(2px)',
    },
  },
  {
    id: 'yozakura',
    name: '夜桜',
    concept: '夜店に桜餅を重ねた案。ダークは紫の夜に桜色の灯り、ライトは淡い桜色に深い桜紫。提灯の縁取りを桜色で。',
    light: {
      ...YOMISE_LIGHT,
      bg: '#fffafc',
      surface: '#f8ecf2',
      fg: '#2a1525',
      muted: '#66485c',
      border: '#ecd3e0',
      accent: '#a3346f',
    },
    dark: {
      ...YOMISE_DARK,
      bg: '#1c1222',
      surface: '#29192f',
      fg: '#fbeef5',
      muted: '#cfb1c4',
      border: '#452c4c',
      accent: '#ffa3c7',
      'accent-fg': '#1c1222',
      focus: '#9cc2ff',
    },
    shape: LANTERN_SHAPE,
  },
  {
    id: 'yoimiya',
    name: '宵宮',
    concept: '夜店にラムネを重ねた案。ダークは藍色の夜空に提灯の琥珀色、ライトは淡い空色に藍紫。縁取りと光は提灯と同じ。',
    light: {
      ...YOMISE_LIGHT,
      bg: '#f8f9fd',
      surface: '#e9edf8',
      fg: '#151a33',
      muted: '#4b5272',
      border: '#ccd3ea',
      accent: '#3a3f9e',
    },
    dark: {
      ...YOMISE_DARK,
      bg: '#141a33',
      surface: '#1d2546',
      fg: '#eef1ff',
      muted: '#b0b8da',
      border: '#2f3a66',
      'accent-fg': '#141a33',
      focus: '#9cc2ff',
    },
    shape: { ...LANTERN_SHAPE, backdrop: 'rgb(6 10 28 / 0.62)' },
  },
]

export const PRESETS: Preset[] = [
  ...YOMISE_VARIANTS,
  {
    id: 'current',
    name: '現行',
    concept: '比較用の基準。温かい生成り色の面に焦げたオレンジのアクセント、丸いボタン。',
    light: {
      bg: '#ffffff',
      surface: '#f5f3ef',
      fg: '#1f1b16',
      muted: '#5f574d',
      border: '#d8d1c6',
      accent: '#a24c08',
      'accent-fg': '#ffffff',
      danger: '#b42318',
      'danger-bg': '#fdecea',
      'warn-bg': '#fff4d6',
      'warn-border': '#e6b84a',
      success: '#1e7a3c',
      focus: '#2563eb',
    },
    dark: {
      bg: '#1d1a17',
      surface: '#2a2622',
      fg: '#f3eee7',
      muted: '#c2b8aa',
      border: '#4a433b',
      accent: '#f0a04b',
      'accent-fg': '#1d1a17',
      danger: '#ff8a7f',
      'danger-bg': '#3d1f1c',
      'warn-bg': '#3a2f17',
      'warn-border': '#a57f2a',
      success: '#6fd69a',
      focus: '#8ab4ff',
    },
    shape: {
      radius: '12px',
      'radius-sm': '8px',
      'modal-radius': '20px',
      'btn-radius': '999px',
      'input-radius': '10px',
      'border-width': '1px',
      'btn-shadow': 'none',
      'modal-border': 'none',
      'modal-shadow': '0 20px 60px rgb(0 0 0 / 0.3)',
      backdrop: 'rgb(0 0 0 / 0.45)',
    },
  },
  {
    id: 'ai-gamaguchi',
    name: '藍がま口',
    concept: '藍染の布財布と真鍮の口金。明るい面は藍、暗い面では口金の真鍮色が主役になる。角は控えめに丸めた端正な形。',
    light: {
      bg: '#ffffff',
      surface: '#eef1f6',
      fg: '#16202e',
      muted: '#4f5b6b',
      border: '#cbd3de',
      accent: '#233f6e',
      'accent-fg': '#ffffff',
      danger: '#b3261e',
      'danger-bg': '#fbeaea',
      'warn-bg': '#fbf3dc',
      'warn-border': '#c9a227',
      success: '#1f7a4d',
      focus: '#3b6fd6',
    },
    dark: {
      bg: '#121a27',
      surface: '#1c2636',
      fg: '#e8edf5',
      muted: '#a7b3c5',
      border: '#33415a',
      accent: '#d4b24c',
      'accent-fg': '#121a27',
      danger: '#ff8f87',
      'danger-bg': '#3a1d1f',
      'warn-bg': '#33290f',
      'warn-border': '#b8952a',
      success: '#6fd3a0',
      focus: '#8fb4ff',
    },
    shape: {
      radius: '10px',
      'radius-sm': '6px',
      'modal-radius': '16px',
      'btn-radius': '10px',
      'input-radius': '8px',
      'border-width': '1px',
      'btn-shadow': 'none',
      'modal-border': 'none',
      'modal-shadow': '0 24px 48px rgb(10 20 40 / 0.28)',
      backdrop: 'rgb(12 20 36 / 0.55)',
    },
  },
  {
    id: 'shuin',
    name: '朱印',
    concept: '白い紙に墨の線、押された朱の判子。枠線を墨色の太めの線にして、角はほぼ四角。押印のような朱のボタンが一点だけ目立つ。',
    light: {
      bg: '#fcfcfa',
      surface: '#f0f0ed',
      fg: '#1a1a1a',
      muted: '#555555',
      border: '#1a1a1a',
      accent: '#c23a22',
      'accent-fg': '#ffffff',
      danger: '#8e1b1b',
      'danger-bg': '#f7e4e1',
      'warn-bg': '#f6efd9',
      'warn-border': '#b8860b',
      success: '#2e6b3a',
      focus: '#1f5fbf',
    },
    dark: {
      bg: '#18181a',
      surface: '#232326',
      fg: '#f2f1ed',
      muted: '#b5b3ad',
      border: '#8d8a84',
      accent: '#ff6a4a',
      'accent-fg': '#18181a',
      danger: '#ff9b8f',
      'danger-bg': '#3b1c19',
      'warn-bg': '#33290f',
      'warn-border': '#b8952a',
      success: '#7fcf8e',
      focus: '#8ab4ff',
    },
    shape: {
      radius: '4px',
      'radius-sm': '2px',
      'modal-radius': '6px',
      'btn-radius': '4px',
      'input-radius': '2px',
      'border-width': '1.5px',
      'btn-shadow': 'none',
      'modal-border': '1.5px solid var(--mwk-border)',
      'modal-shadow': '0 12px 32px rgb(0 0 0 / 0.18)',
      backdrop: 'rgb(20 18 16 / 0.4)',
    },
  },
  {
    id: 'bbs',
    name: '掲示板',
    concept:
      'モナコインの出自である2000年代のテキスト掲示板。灰色の地に白い枠、リンクの青、立体的な古いボタン。懐かしいが今の解像度で整える。',
    light: {
      bg: '#efefef',
      surface: '#ffffff',
      fg: '#000000',
      muted: '#555555',
      border: '#b0b0b0',
      accent: '#0033cc',
      'accent-fg': '#ffffff',
      danger: '#cc0000',
      'danger-bg': '#ffe8e8',
      'warn-bg': '#ffffe0',
      'warn-border': '#b5a300',
      success: '#007a00',
      focus: '#d14b00',
    },
    dark: {
      bg: '#10131c',
      surface: '#1a1f2c',
      fg: '#e6e6e6',
      muted: '#9aa3b5',
      border: '#3a4256',
      accent: '#6f9cff',
      'accent-fg': '#0b0f1a',
      danger: '#ff7a7a',
      'danger-bg': '#3a1a1a',
      'warn-bg': '#2f2d12',
      'warn-border': '#a39a2a',
      success: '#6fd36f',
      focus: '#ffa64d',
    },
    shape: {
      radius: '2px',
      'radius-sm': '2px',
      'modal-radius': '4px',
      'btn-radius': '3px',
      'input-radius': '2px',
      'border-width': '1px',
      'btn-shadow': 'inset 0 -2px 0 rgb(0 0 0 / 0.2)',
      'modal-border': '1px solid var(--mwk-border)',
      'modal-shadow': '0 6px 18px rgb(0 0 0 / 0.25)',
      backdrop: 'rgb(0 0 0 / 0.35)',
    },
  },
  {
    id: 'rokusho',
    name: '緑青',
    concept: '古銭に浮く青緑の錆。落ち着いた青緑を基調に、大きめの角丸と深い影で手に馴染む柔らかさを出す。',
    light: {
      bg: '#ffffff',
      surface: '#e9f2ef',
      fg: '#12302a',
      muted: '#4a625c',
      border: '#c3d6d0',
      accent: '#1f6f60',
      'accent-fg': '#ffffff',
      danger: '#b42318',
      'danger-bg': '#fdecea',
      'warn-bg': '#fbf2d5',
      'warn-border': '#c4a03a',
      success: '#2d7a2d',
      focus: '#1d5fd1',
    },
    dark: {
      bg: '#0e1c19',
      surface: '#172a26',
      fg: '#e4f1ed',
      muted: '#9fbdb5',
      border: '#2c4741',
      accent: '#5fd0b5',
      'accent-fg': '#0e1c19',
      danger: '#ff8a7f',
      'danger-bg': '#3d1f1c',
      'warn-bg': '#33290f',
      'warn-border': '#b8952a',
      success: '#8be08b',
      focus: '#9cc2ff',
    },
    shape: {
      radius: '14px',
      'radius-sm': '10px',
      'modal-radius': '24px',
      'btn-radius': '14px',
      'input-radius': '12px',
      'border-width': '1px',
      'btn-shadow': 'none',
      'modal-border': 'none',
      'modal-shadow': '0 30px 60px rgb(8 30 26 / 0.28)',
      backdrop: 'rgb(6 24 20 / 0.5)',
    },
  },
  {
    id: 'ramune',
    name: 'ラムネ',
    concept: 'ラムネ瓶の水色とビー玉。太めの枠線と大きな丸み、水色の影で、軽くて楽しい手触りにする。',
    light: {
      bg: '#ffffff',
      surface: '#e8f5fd',
      fg: '#0f2a3d',
      muted: '#48667a',
      border: '#b9dcef',
      accent: '#0872ae',
      'accent-fg': '#ffffff',
      danger: '#c42b4a',
      'danger-bg': '#fdeaf0',
      'warn-bg': '#fff6d6',
      'warn-border': '#e2b93b',
      success: '#12805c',
      focus: '#e0522f',
    },
    dark: {
      bg: '#0b1e2c',
      surface: '#132c40',
      fg: '#e6f6ff',
      muted: '#9cc4dc',
      border: '#24506e',
      accent: '#6fd0ff',
      'accent-fg': '#062033',
      danger: '#ff8fa8',
      'danger-bg': '#3a1724',
      'warn-bg': '#33290f',
      'warn-border': '#c9a43a',
      success: '#6fe0b5',
      focus: '#ffb38a',
    },
    shape: {
      radius: '18px',
      'radius-sm': '12px',
      'modal-radius': '28px',
      'btn-radius': '999px',
      'input-radius': '14px',
      'border-width': '2px',
      'btn-shadow': 'none',
      'modal-border': 'none',
      'modal-shadow': '0 18px 40px rgb(10 127 194 / 0.25)',
      backdrop: 'rgb(5 40 70 / 0.45)',
    },
  },
  {
    id: 'dagashi',
    name: '駄菓子',
    concept: '駄菓子屋の黄色い値札と手書きの太い線。黒い太枠とずらした影で、ボタンを押したくなる大胆さを一点に集める。',
    light: {
      bg: '#ffffff',
      surface: '#fff3b0',
      fg: '#000000',
      muted: '#3d3d3d',
      border: '#000000',
      accent: '#ffd400',
      'accent-fg': '#000000',
      danger: '#c8003a',
      'danger-bg': '#ffe0ea',
      'warn-bg': '#ffe7f1',
      'warn-border': '#000000',
      success: '#007a3d',
      focus: '#2e5bff',
    },
    dark: {
      bg: '#1b1922',
      surface: '#2c2836',
      fg: '#fffbe6',
      muted: '#cfc8b8',
      border: '#fffbe6',
      accent: '#ffd400',
      'accent-fg': '#000000',
      danger: '#ff7a9c',
      'danger-bg': '#3d1626',
      'warn-bg': '#3a1f30',
      'warn-border': '#fffbe6',
      success: '#74e0a2',
      focus: '#7fa0ff',
    },
    shape: {
      radius: '10px',
      'radius-sm': '6px',
      'modal-radius': '14px',
      'btn-radius': '10px',
      'input-radius': '8px',
      'border-width': '2px',
      'btn-shadow': '3px 3px 0 var(--mwk-border)',
      'modal-border': '2px solid var(--mwk-border)',
      'modal-shadow': '6px 6px 0 var(--mwk-border)',
      backdrop: 'rgb(0 0 0 / 0.3)',
    },
  },
  {
    id: 'yomise',
    name: '夜店',
    concept: '夏祭りの夜店。ダークでは紫がかった夜空に提灯の琥珀色、ライトでは淡い藤色に梅紫。光がにじむような影。',
    light: {
      bg: '#fbf8fc',
      surface: '#f1e9f3',
      fg: '#24132b',
      muted: '#5e4a66',
      border: '#dccbe0',
      accent: '#7b2c74',
      'accent-fg': '#ffffff',
      danger: '#b3263a',
      'danger-bg': '#fbe8ec',
      'warn-bg': '#fff1d6',
      'warn-border': '#e09b2d',
      success: '#2b7a4b',
      focus: '#c46a00',
    },
    dark: {
      bg: '#1a1020',
      surface: '#26182e',
      fg: '#f6eaf7',
      muted: '#c7b0cc',
      border: '#3f2a48',
      accent: '#ffb04a',
      'accent-fg': '#1a1020',
      danger: '#ff8a9a',
      'danger-bg': '#3d1823',
      'warn-bg': '#3a2614',
      'warn-border': '#c98a2e',
      success: '#7fd8a0',
      focus: '#c99cff',
    },
    shape: {
      radius: '16px',
      'radius-sm': '10px',
      'modal-radius': '22px',
      'btn-radius': '999px',
      'input-radius': '12px',
      'border-width': '1px',
      'btn-shadow': 'none',
      'modal-border': 'none',
      'modal-shadow': '0 0 0 1px rgb(255 176 74 / 0.18), 0 24px 60px rgb(30 10 40 / 0.45)',
      backdrop: 'rgb(26 10 32 / 0.55)',
    },
  },
  {
    id: 'sumi',
    name: '墨と紙',
    concept: '白と黒だけで作り、色が付くのは下端のアドレスの帯だけ。どのアプリに置いても浮かず、それでいて帯で「このウォレット」とわかる。',
    light: {
      bg: '#ffffff',
      surface: '#f2f2f2',
      fg: '#000000',
      muted: '#5c5c5c',
      border: '#d4d4d4',
      accent: '#000000',
      'accent-fg': '#ffffff',
      danger: '#b42318',
      'danger-bg': '#fdecea',
      'warn-bg': '#f2f2f2',
      'warn-border': '#8a8a8a',
      success: '#1e6b3a',
      focus: '#2563eb',
    },
    dark: {
      bg: '#181818',
      surface: '#242424',
      fg: '#f5f5f5',
      muted: '#ababab',
      border: '#3a3a3a',
      accent: '#f5f5f5',
      'accent-fg': '#000000',
      danger: '#ff8a7f',
      'danger-bg': '#3a1d1b',
      'warn-bg': '#2a2a2a',
      'warn-border': '#777777',
      success: '#7fd69a',
      focus: '#8ab4ff',
    },
    shape: {
      radius: '8px',
      'radius-sm': '6px',
      'modal-radius': '12px',
      'btn-radius': '8px',
      'input-radius': '6px',
      'border-width': '1px',
      'btn-shadow': 'none',
      'modal-border': 'none',
      'modal-shadow': '0 16px 40px rgb(0 0 0 / 0.22)',
      backdrop: 'rgb(0 0 0 / 0.5)',
    },
  },
  {
    id: 'sakuramochi',
    name: '桜餅',
    concept: '桜色の餅と塩漬けの葉。やわらかな桜色に、注意書きや成功表示には葉の緑。大きな丸みで親しみやすく。',
    light: {
      bg: '#fffafb',
      surface: '#fdeef2',
      fg: '#3a1e27',
      muted: '#6f4c57',
      border: '#f1cdd7',
      accent: '#c2416c',
      'accent-fg': '#ffffff',
      danger: '#b3261e',
      'danger-bg': '#fdebe9',
      'warn-bg': '#f2f6e6',
      'warn-border': '#8aa64a',
      success: '#4d7c2f',
      focus: '#3a7bd5',
    },
    dark: {
      bg: '#22161b',
      surface: '#2f1f26',
      fg: '#fbeef2',
      muted: '#d0b0bb',
      border: '#4a3039',
      accent: '#ff8fb1',
      'accent-fg': '#22161b',
      danger: '#ff9a8f',
      'danger-bg': '#3d1f1c',
      'warn-bg': '#262d1a',
      'warn-border': '#8aa64a',
      success: '#a6d97f',
      focus: '#9cc2ff',
    },
    shape: {
      radius: '20px',
      'radius-sm': '14px',
      'modal-radius': '28px',
      'btn-radius': '999px',
      'input-radius': '16px',
      'border-width': '1px',
      'btn-shadow': 'none',
      'modal-border': 'none',
      'modal-shadow': '0 20px 50px rgb(120 40 70 / 0.22)',
      backdrop: 'rgb(60 20 35 / 0.4)',
    },
  },
]

/** 比較ページで最初に表示する案（最終候補） */
export const DEFAULT_VISIBLE = [
  'adopted',
  'yomise',
  'yomise-lantern',
  'yomise-lifted',
  'yozakura',
  'yoimiya',
  'sakuramochi',
  'ramune',
  'dagashi',
]

// MARK: コントラスト（WCAG 2.x）

/** 検査する組み合わせと必要なコントラスト比 */
export const CONTRAST_CHECKS: [fg: keyof ColorTokens, bg: keyof ColorTokens, min: number][] = [
  ['fg', 'bg', 7],
  ['fg', 'surface', 7],
  ['muted', 'bg', 4.5],
  ['muted', 'surface', 4.5],
  ['accent-fg', 'accent', 4.5],
  ['danger', 'danger-bg', 4.5],
  ['success', 'bg', 4.5],
  ['focus', 'bg', 3],
  ['fg', 'warn-bg', 7],
]

export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!
}

/** 指定したモードのトークンを .mwk-root に強制適用するCSS（OSのカラーモード設定より優先させる） */
export function presetCss(preset: Preset, scheme: 'light' | 'dark'): string {
  const colors = scheme === 'light' ? preset.light : preset.dark
  const decls = [...Object.entries(colors), ...Object.entries(preset.shape)].map(([k, v]) => `--mwk-${k}: ${v};`).join(' ')
  const filter = scheme === 'light' ? 'contrast(50%) saturate(300%)' : 'none'
  return `html .mwk-root { ${decls} } html .mwk-address-colors { filter: ${filter}; }`
}
