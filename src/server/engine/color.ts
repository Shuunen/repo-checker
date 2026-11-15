/**
 * Color helpers: normalize a hex color, derive the darker shade and the readable text color of a theme color.
 * @module
 */

/** The color channels go from 0 to 255 */
const maxChannel = 255

/** Saturation and lightness are written in percent */
const percent = 100

/** A hue sector is 30 degrees wide */
const hueSector = 30

/** There are 12 hue sectors in the color wheel */
const hueSectors = 12

/** There are 360 degrees in the color wheel */
const hueCount = 360

/** There are 6 sextants in the color wheel, a sextant is 60 degrees wide */
const sextants = 6

/** The width of a sextant in degrees */
const sextant = 60

/** The hex digits of a short color like `#fa0` */
const shortLength = 3

/** A channel is written in base 16 */
const hexBase = 16

/** A channel is written on two hex digits */
const hexDigits = 2

/** The green channel is at the start of the wheel, the red one 8 sectors later */
const redOffset = 8

/** The blue one is 4 sectors later */
const blueOffset = 4

/** A channel rises 3 sectors after its offset */
const quarter = 3

/** A channel falls 9 sectors after its offset */
const threeQuarters = 9

/** The hue offset of the green sextant */
const greenShift = 2

/** The hue offset of the blue sextant */
const blueShift = 4

/** The lightness points taken off the theme color to get the darker shade, the activity bar is darker than the title bar */
const darkerPoints = 16

/** Below this luminance a light text is easier to read, it is where the contrast with white equals the contrast with black */
const luminanceThreshold = 0.179

/** The gamma of the sRGB channels */
const gamma = 2.4

/** The sRGB linear threshold */
const linearThreshold = 0.04

/** The sRGB linear divisor */
const linearDivisor = 12.92

/** The sRGB gamma offset */
const gammaOffset = 0.055

/** The sRGB gamma divisor */
const gammaDivisor = 1.055

/** The weight of the red channel in the luminance */
const redWeight = 0.2126

/** The weight of the green channel in the luminance */
const greenWeight = 0.7152

/** The weight of the blue channel in the luminance */
const blueWeight = 0.0722

/** The text color on a dark background */
const lightText = '#f9fafb'

/** The text color on a light background */
const darkText = '#111827'

/** A color as hue (0 to 359), saturation and lightness (0 to 100) */
interface Hsl {
  /** The hue in degrees */
  hue: number
  /** The lightness in percent */
  lightness: number
  /** The saturation in percent */
  saturation: number
}

/**
 * Normalize a hex color to `#rrggbb` in lower case, so two writings of one color compare equal
 * @param color anything, like `#FFF` or `#024EB8`
 * @returns the normalized color, undefined when it is not a hex color of 3 or 6 digits
 * @example normalizeColor('#FA0') // '#ffaa00'
 */
export function normalizeColor(color: unknown) {
  const digits = typeof color === 'string' ? /^#(?<digits>[\da-f]{3}|[\da-f]{6})$/iu.exec(color)?.groups?.digits?.toLowerCase() : undefined
  if (digits === undefined) return undefined
  return `#${digits.length === shortLength ? digits.replaceAll(/./gu, '$&$&') : digits}`
}

/**
 * Split a normalized hex color in its red, green and blue channels
 * @param color the color like `#024eb8`
 * @returns the three channels, from 0 to 1
 */
function channels(color: string) {
  return [...color.matchAll(/[\da-f]{2}/gu)].map(([channel]) => Number.parseInt(channel, hexBase) / maxChannel)
}

/**
 * Convert a normalized hex color to hsl
 * @param color the color like `#024eb8`
 * @returns the hue, saturation and lightness
 */
function toHsl(color: string): Hsl {
  const [red = 0, green = 0, blue = 0] = channels(color)
  const [max, min] = [Math.max(red, green, blue), Math.min(red, green, blue)]
  const delta = max - min
  const light = (max + min) / hexDigits
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(hexDigits * light - 1))
  let sector = 0
  if (delta > 0 && max === red) sector = ((green - blue) / delta + sextants) % sextants
  else if (delta > 0 && max === green) sector = (blue - red) / delta + greenShift
  else if (delta > 0) sector = (red - green) / delta + blueShift
  return { hue: Math.round(sector * sextant) % hueCount, lightness: light * percent, saturation: saturation * percent }
}

/**
 * Convert a color from hsl to hex
 * @param hsl the color
 * @param hsl.hue the hue, from 0 to 359
 * @param hsl.saturation the saturation in percent
 * @param hsl.lightness the lightness in percent
 * @returns the color like `#024eb8`
 */
function toHex({ hue, lightness, saturation }: Readonly<Hsl>) {
  const [fraction, light] = [saturation / percent, lightness / percent]
  const spread = fraction * Math.min(light, 1 - light)
  const channel = (offset: number) => {
    const position = (offset + hue / hueSector) % hueSectors
    const value = light - spread * Math.max(-1, Math.min(position - quarter, threeQuarters - position, 1))
    return Math.round(value * maxChannel)
      .toString(hexBase)
      .padStart(hexDigits, '0')
  }
  return `#${channel(0)}${channel(redOffset)}${channel(blueOffset)}`
}

/**
 * Make a color darker, with the same hue and saturation
 * @param color a normalized hex color
 * @returns the darker color, black at the darkest
 * @example darken('#024eb8') // '#012c67'
 */
export function darken(color: string) {
  const hsl = toHsl(color)
  return toHex({ ...hsl, lightness: Math.max(0, hsl.lightness - darkerPoints) })
}

/**
 * Pick the text color that is the easiest to read on a background
 * @param color a normalized hex color, the background
 * @returns a near white or a near black
 * @example readableText('#024eb8') // '#f9fafb'
 */
export function readableText(color: string) {
  const [red = 0, green = 0, blue = 0] = channels(color).map(value => (value <= linearThreshold ? value / linearDivisor : ((value + gammaOffset) / gammaDivisor) ** gamma))
  return redWeight * red + greenWeight * green + blueWeight * blue > luminanceThreshold ? darkText : lightText
}

/** The share of each channel kept to dim a color, for the status bar of a window that has no focus */
const dimFactor = 0.65

/** The alpha of the status bar text, a little softer than the title text */
const statusAlpha = 'cc'

/** The alpha of the title bar text of a window that has no focus */
const inactiveAlpha = 'aa'

/**
 * Dim a color, every channel keeps the same share of its value
 * @param color a normalized hex color
 * @returns the dimmer color
 * @example dim('#281840') // '#1a102a'
 */
function dim(color: string) {
  return `#${channels(color)
    .map(value =>
      Math.round(value * maxChannel * dimFactor)
        .toString(hexBase)
        .padStart(hexDigits, '0'),
    )
    .join('')}`
}

/**
 * The colors of a VS Code window for a theme color: the title bar and the badges are the theme color, the activity bar and the status bar a darker shade of it, the status bar of a window without focus a dimmer one, and the texts are readable on their bar
 * @param themeColor a normalized hex color
 * @returns the `workbench.colorCustomizations` value
 * @example workbenchColors('#024eb8') // { 'activityBar.background': '#012c67', 'titleBar.activeBackground': '#024eb8', ... }
 */
export function workbenchColors(themeColor: string) {
  const darker = darken(themeColor)
  const [onTheme, onDarker] = [readableText(themeColor), readableText(darker)]
  return {
    'activityBar.background': darker,
    'activityBar.foreground': onDarker,
    'activityBarBadge.background': themeColor,
    'activityBarBadge.foreground': onTheme,
    'statusBar.background': darker,
    'statusBar.foreground': `${onDarker}${statusAlpha}`,
    'statusBar.inactiveBackground': dim(darker),
    'tab.activeBorderTop': themeColor,
    'titleBar.activeBackground': themeColor,
    'titleBar.activeForeground': onTheme,
    'titleBar.inactiveBackground': darker,
    'titleBar.inactiveForeground': `${onDarker}${inactiveAlpha}`,
  }
}
