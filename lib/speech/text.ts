// Plain speech only: citation buttons, source URLs and Markdown remain on screen.
export function speechText(input: string) {
  return input.normalize('NFC')
    .replace(/```[\s\S]*?```/g, '。代码请查看文字。')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\[\d+(?:[,，、]\s*\d+)*\]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/(^|\n)\s*(?:#{1,6}\s+|[-*+]\s+)/g, '$1')
    .replace(/(\d)\s*\*\s*(?=\d)/g, '$1乘')
    .replace(/×/g, '乘')
    .replace(/[*_`~]/g, '')
    .replace(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, '$1年$2月$3日')
    .replace(/kg\s*CO[₂2]\s*e/gi, '千克二氧化碳当量')
    .replace(/kg\s*CO[₂2]/gi, '千克二氧化碳')
    .replace(/CO[₂2]\s*e/gi, '二氧化碳当量')
    .replace(/CO[₂2]/gi, '二氧化碳')
    .replace(/\bkWh\b/gi, '千瓦时')
    .replace(/\bkg\b/gi, '千克')
    .replace(/\n+/g, '。')
    .replace(/\s+/g, ' ')
    .replace(/。{2,}/g, '。').trim();
}
