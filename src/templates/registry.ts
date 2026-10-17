import type { TemplateId, Theme } from '../domain/profile'

export interface Palette { name: string; acid: string; blue: string }
export interface TemplateDefinition {
  id: TemplateId
  letter: string
  name: string
  shortName: string
  chinese: string
  description: string
  font: Theme['font']
  palettes: Palette[]
}

export const templates: TemplateDefinition[] = [
  {
    id: 'y2k', letter: 'A', name: 'Y2K COLLAGE', shortName: 'Y2K', chinese: '拼贴你的世界',
    description: '超大字形、青柠色与纸张拼贴。让角色站在画面中心。', font: 'modern',
    palettes: [
      { name: '青柠 / 钴蓝', acid: '#d5ec42', blue: '#2949dd' },
      { name: '粉纸 / 墨蓝', acid: '#f2afca', blue: '#253680' },
      { name: '奶油 / 橘红', acid: '#f6e9bd', blue: '#b7472c' },
      { name: '冰蓝 / 深紫', acid: '#badfeb', blue: '#523aac' },
      { name: '紫藤 / 葡萄', acid: '#e4ccf4', blue: '#73338e' },
      { name: '杏橘 / 松绿', acid: '#ffca91', blue: '#255c3e' },
      { name: '玫瑰 / 莓果', acid: '#ffc3dc', blue: '#842e4d' },
      { name: '晴空 / 海蓝', acid: '#c5eaff', blue: '#214bc2' },
    ],
  },
  {
    id: 'minimal', letter: 'B', name: 'QUIET MINIMAL', shortName: 'MINIMAL', chinese: '留白，也是一种表达',
    description: '柔和配色与干净留白，把注意力留给你。', font: 'modern',
    palettes: [
      { name: '鼠尾草 / 深林', acid: '#e8ede5', blue: '#344b40' },
      { name: '雾白 / 石墨', acid: '#f3f2ed', blue: '#3b4245' },
      { name: '燕麦 / 可可', acid: '#eee7dc', blue: '#665045' },
      { name: '晨雾 / 海松', acid: '#e4edf0', blue: '#355563' },
      { name: '浅桃 / 玫木', acid: '#f3e7e1', blue: '#865347' },
      { name: '丁香 / 灰紫', acid: '#eeebf3', blue: '#635470' },
      { name: '抹茶 / 苔绿', acid: '#edf0dc', blue: '#536137' },
      { name: '银灰 / 藏蓝', acid: '#eaedf0', blue: '#36485e' },
    ],
  },
  {
    id: 'cyber', letter: 'C', name: 'HARD CYBER', shortName: 'CYBER', chinese: '另一种频率',
    description: '深色空间、锋利字形和克制的光线，切换到你的频率。', font: 'modern',
    palettes: [
      { name: '电青 / 信号红', acid: '#79edf5', blue: '#ff654f' },
      { name: '荧绿 / 紫电', acid: '#c4f56b', blue: '#bfa1ff' },
      { name: '紫光 / 珊瑚', acid: '#c9adff', blue: '#ff9282' },
      { name: '琥珀 / 冰蓝', acid: '#ffc875', blue: '#8be1ff' },
      { name: '银白 / 电蓝', acid: '#e1e9f0', blue: '#8cbcff' },
      { name: '酸橙 / 熔金', acid: '#e0f17a', blue: '#ffc164' },
      { name: '霓粉 / 青光', acid: '#ffa2db', blue: '#72e1d6' },
      { name: '薄荷 / 朱红', acid: '#90f2c5', blue: '#ff8875' },
    ],
  },
  {
    id: 'editorial', letter: 'D', name: 'PAPER & INK', shortName: 'EDITORIAL', chinese: '写成一本自己的杂志',
    description: '暖纸、衬线与艺术书式画廊，慢慢展开你的故事。', font: 'editorial',
    palettes: [
      { name: '暖纸 / 砖红', acid: '#f2eadb', blue: '#b3452b' },
      { name: '米纸 / 酒红', acid: '#f2e9e2', blue: '#842e42' },
      { name: '旧书 / 苔绿', acid: '#ede9d6', blue: '#4a6546' },
      { name: '象牙 / 靛蓝', acid: '#f3eee3', blue: '#354b78' },
      { name: '灰纸 / 墨黑', acid: '#eae6df', blue: '#343334' },
      { name: '粉笺 / 桑葚', acid: '#f1e3e5', blue: '#784159' },
      { name: '羊皮纸 / 棕墨', acid: '#eee0c8', blue: '#795236' },
      { name: '珍珠 / 群青', acid: '#eeecea', blue: '#4257a0' },
    ],
  },
]
export const isTemplateId = (value: unknown): value is TemplateId => templates.some(template => template.id === value)
export const getTemplate = (id: TemplateId) => templates.find(template => template.id === id)!
export function defaultTheme(id: TemplateId): Theme {
  const template = getTemplate(id)
  return { acid: template.palettes[0]!.acid, blue: template.palettes[0]!.blue, font: template.font, nameFontEn: 'template', nameFontZh: 'template' }
}
