import {
  forceCollide,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum
} from 'd3-force'

export type HeroTagShape = 'round' | 'text'
export type HeroTagProminence = 'primary' | 'normal' | 'compact'
export type HeroLayoutProfile = 'desktop' | 'medium' | 'mobile' | 'short-mobile'

export type HeroRect = {
  x: number
  y: number
  width: number
  height: number
}

type HeroLayoutRect = HeroRect & {
  left: number
  top: number
  right: number
  bottom: number
}

export type HeroViewport = {
  width: number
  height: number
}

export type HeroFloatingTag = {
  name: string
  shape: HeroTagShape
  prominence?: HeroTagProminence
}

export type HeroTagLayout = {
  key: string
  x: number
  y: number
  width: number
  height: number
  depth: number
  driftX: number
  driftY: number
  scatterX: number
  scatterY: number
  delay: number
}

export type ComputeHeroTagLayoutInput = {
  tags: readonly HeroFloatingTag[]
  stageRect: HeroRect
  safeRects: readonly HeroRect[]
  viewport: HeroViewport
  profile?: HeroLayoutProfile
}

type HeroLayoutBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type HeroLayoutConfig = {
  edgePadding: number
  safePadding: number
  collisionPadding: number
  visualPadding: number
  driftMax: number
  iterations: number
  roundSize: number
  primarySize: number
  compactSize: number
  textWidth: number
  textHeight: number
}

type HeroLayoutNode = SimulationNodeDatum & {
  key: string
  shape: HeroTagShape
  prominence: HeroTagProminence
  width: number
  height: number
  visualWidth: number
  visualHeight: number
  radius: number
  targetX: number
  targetY: number
  band: 'top' | 'bottom' | 'left' | 'right' | 'free'
  depth: number
  driftX: number
  driftY: number
  delay: number
}

export function getHeroLayoutProfile(viewport: HeroViewport): HeroLayoutProfile {
  if (viewport.width <= 640 && viewport.height <= 720) return 'short-mobile'
  if (viewport.width <= 640) return 'mobile'
  if (viewport.width <= 1320) return 'medium'
  return 'desktop'
}

export function computeHeroTagLayout(input: ComputeHeroTagLayoutInput): HeroTagLayout[] {
  const tags = input.tags.slice(0, 10)
  if (tags.length === 0 || input.stageRect.width <= 0 || input.stageRect.height <= 0) {
    return []
  }

  const profile = input.profile ?? getHeroLayoutProfile(input.viewport)
  const config = createLayoutConfig(profile, input.stageRect, input.viewport, tags.length)
  const bounds = createVisibleBounds(input.stageRect, input.viewport, config)
  const safeRects = normalizeSafeRects(input.safeRects, input.stageRect, profile, config)
  const nodes = createInitialNodes(tags, profile, config, bounds, safeRects)
  const seed = hashLayoutSeed(tags, input.viewport, profile)

  forceSimulation<HeroLayoutNode>(nodes)
    .randomSource(createSeededRandom(seed))
    .alpha(1)
    .alphaDecay(0.05)
    .velocityDecay(0.58)
    .force('x', forceX<HeroLayoutNode>((node) => node.targetX).strength(profile.includes('mobile') ? 0.2 : 0.14))
    .force('y', forceY<HeroLayoutNode>((node) => node.targetY).strength(profile.includes('mobile') ? 0.26 : 0.16))
    .force('collide', forceCollide<HeroLayoutNode>((node) => node.radius).strength(0.94).iterations(4))
    .stop()
    .tick(config.iterations)

  resolveLayoutGeometry(nodes, safeRects, bounds, config, profile)

  return nodes.map((node, index) => {
    const x = roundPixel(clamp(node.x ?? node.targetX, bounds.minX + node.visualWidth / 2, bounds.maxX - node.visualWidth / 2))
    const y = roundPixel(clamp(node.y ?? node.targetY, bounds.minY + node.visualHeight / 2, bounds.maxY - node.visualHeight / 2))
    const scrollVector = createScrollExitVector(x, y, input.stageRect, index)

    return {
      key: node.key,
      x,
      y,
      width: roundPixel(node.width),
      height: roundPixel(node.height),
      depth: node.depth,
      driftX: node.driftX,
      driftY: node.driftY,
      scatterX: scrollVector.scatterX,
      scatterY: scrollVector.scatterY,
      delay: node.delay
    }
  })
}

function createScrollExitVector(x: number, y: number, stageRect: HeroRect, index: number) {
  const centerX = stageRect.width / 2
  const centerY = stageRect.height / 2
  let dx = x - centerX
  let dy = y - centerY
  const distance = Math.hypot(dx, dy)

  if (distance < 1) {
    const angle = (index / 7) * Math.PI * 2
    dx = Math.cos(angle)
    dy = Math.sin(angle)
  } else {
    dx /= distance
    dy /= distance
  }

  const exitDistance = Math.hypot(stageRect.width, stageRect.height) * 0.72
  const exitX = x + dx * exitDistance
  const exitY = y + dy * exitDistance

  return {
    scatterX: roundPixel(exitX - x),
    scatterY: roundPixel(exitY - y)
  }
}

function createLayoutConfig(
  profile: HeroLayoutProfile,
  stageRect: HeroRect,
  viewport: HeroViewport,
  count: number
): HeroLayoutConfig {
  const densityScale = count <= 7 ? 1 : Math.max(0.76, 1 - (count - 7) * 0.055)
  const narrowScale = clamp(stageRect.width / 960, 0.64, 1.12)
  const mobileScale = clamp(viewport.width / 390, 0.9, 1.08)

  if (profile === 'short-mobile') {
    return {
      edgePadding: 30,
      safePadding: 12,
      collisionPadding: 9,
      visualPadding: 0,
      driftMax: 0,
      iterations: 210,
      roundSize: 41 * mobileScale * densityScale,
      primarySize: 59 * mobileScale * densityScale,
      compactSize: 36 * mobileScale * densityScale,
      textWidth: 90 * mobileScale * densityScale,
      textHeight: 44 * mobileScale * densityScale
    }
  }

  if (profile === 'mobile') {
    return {
      edgePadding: 30,
      safePadding: 16,
      collisionPadding: 10,
      visualPadding: 0,
      driftMax: 0,
      iterations: 210,
      roundSize: 48 * mobileScale * densityScale,
      primarySize: 70 * mobileScale * densityScale,
      compactSize: 43 * mobileScale * densityScale,
      textWidth: 102 * mobileScale * densityScale,
      textHeight: 52 * mobileScale * densityScale
    }
  }

  if (profile === 'medium') {
    return {
      edgePadding: 34,
      safePadding: 44,
      collisionPadding: 16,
      visualPadding: 0,
      driftMax: 6,
      iterations: 240,
      roundSize: 84 * narrowScale * densityScale,
      primarySize: 110 * narrowScale * densityScale,
      compactSize: 70 * narrowScale * densityScale,
      textWidth: 150 * narrowScale * densityScale,
      textHeight: 76 * narrowScale * densityScale
    }
  }

  return {
    edgePadding: 42,
    safePadding: 50,
    collisionPadding: 18,
    visualPadding: 0,
    driftMax: 10,
    iterations: 260,
    roundSize: 116 * densityScale,
    primarySize: 176 * densityScale,
    compactSize: 88 * densityScale,
    textWidth: 198 * densityScale,
    textHeight: 92 * densityScale
  }
}

function createVisibleBounds(stageRect: HeroRect, viewport: HeroViewport, config: HeroLayoutConfig): HeroLayoutBounds {
  const edge = config.edgePadding + config.driftMax
  const minX = Math.max(0, edge - stageRect.x)
  const minY = Math.max(0, edge - stageRect.y)
  const maxX = Math.min(stageRect.width, viewport.width - stageRect.x - edge)
  const maxY = Math.min(stageRect.height, viewport.height - stageRect.y - edge)

  return {
    minX,
    minY,
    maxX: Math.max(minX + 1, maxX),
    maxY: Math.max(minY + 1, maxY)
  }
}

function normalizeSafeRects(
  safeRects: readonly HeroRect[],
  stageRect: HeroRect,
  profile: HeroLayoutProfile,
  config: HeroLayoutConfig
): HeroLayoutRect[] {
  const measured = safeRects
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => expandRect(rect, config.safePadding))

  if (measured.length > 0) return measured

  const fallbackWidth = profile.includes('mobile')
    ? stageRect.width * 0.92
    : Math.min(stageRect.width * 0.62, 880)
  const fallbackHeight = profile.includes('mobile')
    ? stageRect.height * 0.48
    : Math.min(stageRect.height * 0.48, 430)

  return [
    expandRect({
      x: (stageRect.width - fallbackWidth) / 2,
      y: (stageRect.height - fallbackHeight) / 2,
      width: fallbackWidth,
      height: fallbackHeight
    }, 0)
  ]
}

function createInitialNodes(
  tags: readonly HeroFloatingTag[],
  profile: HeroLayoutProfile,
  config: HeroLayoutConfig,
  bounds: HeroLayoutBounds,
  safeRects: readonly HeroLayoutRect[]
): HeroLayoutNode[] {
  const safeUnion = unionRects(safeRects)
  const targetFactory = profile.includes('mobile')
    ? createMobileTargetFactory(tags.length, bounds, safeUnion, config)
    : createDesktopTargetFactory(tags.length, bounds, safeUnion, config)

  return tags.map((tag, index) => {
    const dimensions = getTagDimensions(tag, config)
    const target = targetFactory(index, dimensions)
    const variation = seededUnit(hashString(`${tag.name}:${index}:${profile}`))
    const visualBounds = getVisualBounds(dimensions.width, dimensions.height, config.visualPadding)

    return {
      key: tag.name,
      shape: tag.shape,
      prominence: tag.prominence ?? 'normal',
      width: dimensions.width,
      height: dimensions.height,
      visualWidth: visualBounds.width,
      visualHeight: visualBounds.height,
      radius: Math.hypot(dimensions.width, dimensions.height) / 2 + config.collisionPadding,
      x: target.x,
      y: target.y,
      targetX: target.x,
      targetY: target.y,
      band: target.band,
      depth: profile.includes('mobile') ? 0 : roundValue(-68 + variation * 142, 1),
      driftX: profile.includes('mobile') ? 0 : roundValue((0.55 + variation * 0.45) * config.driftMax, 1),
      driftY: profile.includes('mobile') ? 0 : roundValue((0.45 + (1 - variation) * 0.42) * config.driftMax, 1),
      delay: -Math.round((index * 930 + variation * 850) % 7200)
    }
  })
}

function createDesktopTargetFactory(
  count: number,
  bounds: HeroLayoutBounds,
  safe: HeroRect,
  config: HeroLayoutConfig
) {
  const gap = config.safePadding + 16
  const leftLaneX = (bounds.minX + Math.max(bounds.minX, safe.x - gap)) / 2
  const rightLaneX = (Math.min(bounds.maxX, safe.x + safe.width + gap) + bounds.maxX) / 2
  const topY = (bounds.minY + Math.max(bounds.minY, safe.y - gap)) / 2
  const bottomY = (Math.min(bounds.maxY, safe.y + safe.height + gap) + bounds.maxY) / 2
  const midUpperY = safe.y + safe.height * 0.25

  const slots = [
    { x: leftLaneX, y: topY + 26, band: 'left' as const },
    { x: leftLaneX, y: midUpperY, band: 'left' as const },
    { x: rightLaneX, y: topY + 52, band: 'right' as const },
    { x: rightLaneX, y: bottomY + 4, band: 'bottom' as const },
    { x: safe.x + safe.width * 0.86, y: topY - 6, band: 'top' as const },
    { x: leftLaneX, y: bottomY, band: 'bottom' as const },
    { x: safe.x + safe.width * 0.16, y: bottomY + 12, band: 'bottom' as const },
    { x: safe.x + safe.width * 0.33, y: topY + 8, band: 'top' as const },
    { x: rightLaneX, y: safe.y + safe.height * 0.45, band: 'right' as const },
    { x: safe.x + safe.width * 0.68, y: bottomY - 8, band: 'bottom' as const }
  ]

  return (index: number, dimensions: { width: number; height: number }) => {
    const slot = slots[index % slots.length]
    const ring = Math.floor(index / slots.length)
    const jitter = (seededUnit(index + count * 17) - 0.5) * (profileJitter(false) + ring * 18)

    return centerWithinBounds(
      slot.x + jitter,
      slot.y - jitter * 0.35,
      dimensions,
      bounds,
      slot.band
    )
  }
}

function createMobileTargetFactory(
  count: number,
  bounds: HeroLayoutBounds,
  safe: HeroRect,
  config: HeroLayoutConfig
) {
  const topYMin = bounds.minY
  const topYMax = Math.max(topYMin, safe.y - config.safePadding)
  const bottomYMin = Math.min(bounds.maxY, safe.y + safe.height + config.safePadding)
  const bottomYMax = bounds.maxY
  const availableWidth = bounds.maxX - bounds.minX
  const compactStep = Math.max(1, config.compactSize + config.collisionPadding)
  const bottomBandHeight = bottomYMax - bottomYMin
  const bottomCapacity = bottomBandHeight >= config.compactSize + config.collisionPadding
    ? Math.max(0, Math.floor(availableWidth / compactStep))
    : 0
  const desiredBottomCount = count <= 3
    ? Math.max(0, count - 2)
    : Math.min(4, Math.max(2, Math.round(count * 0.43)))
  const bottomCount = Math.min(desiredBottomCount, bottomCapacity, count - 1)
  const topCount = count - bottomCount
  const topSlots = createMobileBandSlots(topCount, bounds, topYMin, topYMax, 'top')
  const bottomSlots = createMobileBandSlots(bottomCount, bounds, bottomYMin, bottomYMax, 'bottom')

  return (index: number, dimensions: { width: number; height: number }) => {
    const inTopBand = index < topCount
    const bandIndex = inTopBand ? index : index - topCount
    const slot = (inTopBand ? topSlots : bottomSlots)[bandIndex]
    const jitter = seededUnit(index * 41 + count * 13) - 0.5
    const xInset = Math.max(dimensions.width / 2, config.edgePadding * 0.55)
    const xMin = bounds.minX + xInset
    const xMax = bounds.maxX - xInset
    const yMin = (inTopBand ? topYMin : bottomYMin) + dimensions.height / 2
    const yMax = (inTopBand ? topYMax : bottomYMax) - dimensions.height / 2
    const x = lerp(xMin, xMax, clamp(slot.xRatio + jitter * 0.07, 0, 1))
    const y = lerp(
      Math.min(yMin, yMax),
      Math.max(yMin, yMax),
      clamp(slot.yRatio + jitter * 0.12, 0, 1)
    )

    return centerWithinBounds(x, y, dimensions, bounds, slot.band)
  }
}

function createMobileBandSlots(
  count: number,
  bounds: HeroLayoutBounds,
  yMin: number,
  yMax: number,
  band: 'top' | 'bottom'
) {
  if (count <= 0) return []

  const bandHeight = Math.max(1, yMax - yMin)
  const isThinBand = bandHeight < (bounds.maxY - bounds.minY) * 0.16
  const ratios = band === 'top'
    ? [
        [0.11, isThinBand ? 0.24 : 0.2],
        [0.84, isThinBand ? 0.34 : 0.18],
        [0.48, isThinBand ? 0.68 : 0.58],
        [0.28, isThinBand ? 0.82 : 0.78],
        [0.66, isThinBand ? 0.06 : 0.1],
        [0.94, isThinBand ? 0.72 : 0.64],
        [0.38, isThinBand ? 0.44 : 0.38]
      ]
    : [
        [0.78, isThinBand ? 0.24 : 0.3],
        [0.18, isThinBand ? 0.38 : 0.22],
        [0.52, isThinBand ? 0.78 : 0.72],
        [0.34, isThinBand ? 0.62 : 0.58],
        [0.88, isThinBand ? 0.08 : 0.16],
        [0.64, isThinBand ? 0.92 : 0.84],
        [0.08, isThinBand ? 0.68 : 0.66]
      ]

  return Array.from({ length: count }, (_, index) => {
    const ring = Math.floor(index / ratios.length)
    const [xRatio, yRatio] = ratios[index % ratios.length]
    const ringOffset = ring * 0.09

    return {
      xRatio: clamp(xRatio + (index % 2 === 0 ? ringOffset : -ringOffset), 0.05, 0.95),
      yRatio: clamp(yRatio + (ring % 2 === 0 ? ringOffset : -ringOffset), 0.04, 0.96),
      band
    }
  })
}

function getTagDimensions(tag: HeroFloatingTag, config: HeroLayoutConfig) {
  if (tag.shape === 'text') {
    return { width: config.textWidth, height: config.textHeight }
  }

  const size = tag.prominence === 'primary'
    ? config.primarySize
    : tag.prominence === 'compact'
      ? config.compactSize
      : config.roundSize

  return { width: size, height: size }
}

function getVisualBounds(width: number, height: number, padding: number) {
  return {
    width: width + padding * 2,
    height: height + padding * 2
  }
}

function resolveLayoutGeometry(
  nodes: HeroLayoutNode[],
  safeRects: readonly HeroLayoutRect[],
  bounds: HeroLayoutBounds,
  config: HeroLayoutConfig,
  profile: HeroLayoutProfile
) {
  const attempts = profile.includes('mobile') ? 220 : 180

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let moved = false

    for (const node of nodes) {
      moved = clampNode(node, bounds) || moved
    }

    for (const node of nodes) {
      for (const safe of safeRects) {
        moved = pushNodeOutOfRect(node, safe, bounds, profile) || moved
      }
    }

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        moved = separatePair(nodes[i], nodes[j], bounds, config.collisionPadding) || moved
      }
    }

    if (!moved) break
  }

  for (const node of nodes) {
    clampNode(node, bounds)
  }
}

function pushNodeOutOfRect(
  node: HeroLayoutNode,
  safe: HeroLayoutRect,
  bounds: HeroLayoutBounds,
  profile: HeroLayoutProfile
) {
  const rect = nodeRect(node)
  if (!rectsOverlap(rect, safe)) return false

  const safeCenterX = safe.x + safe.width / 2
  const safeCenterY = safe.y + safe.height / 2
  const leftCandidate = safe.x - node.visualWidth / 2 - 1
  const rightCandidate = safe.x + safe.width + node.visualWidth / 2 + 1
  const topCandidate = safe.y - node.visualHeight / 2 - 1
  const bottomCandidate = safe.y + safe.height + node.visualHeight / 2 + 1
  const candidates = [
    {
      x: leftCandidate,
      y: node.y ?? node.targetY,
      penalty: node.band === 'left' ? 0 : 18
    },
    {
      x: rightCandidate,
      y: node.y ?? node.targetY,
      penalty: node.band === 'right' ? 0 : 18
    },
    {
      x: node.x ?? node.targetX,
      y: topCandidate,
      penalty: node.band === 'top' ? 0 : 18
    },
    {
      x: node.x ?? node.targetX,
      y: bottomCandidate,
      penalty: node.band === 'bottom' ? 0 : 18
    }
  ]
    .map((candidate) => ({
      x: clamp(candidate.x, bounds.minX + node.visualWidth / 2, bounds.maxX - node.visualWidth / 2),
      y: clamp(candidate.y, bounds.minY + node.visualHeight / 2, bounds.maxY - node.visualHeight / 2),
      penalty: candidate.penalty
    }))
    .filter((candidate) => !rectsOverlap(
      {
        x: candidate.x - node.visualWidth / 2,
        y: candidate.y - node.visualHeight / 2,
        width: node.visualWidth,
        height: node.visualHeight,
        left: candidate.x - node.visualWidth / 2,
        top: candidate.y - node.visualHeight / 2,
        right: candidate.x + node.visualWidth / 2,
        bottom: candidate.y + node.visualHeight / 2
      },
      safe
    ))

  if (candidates.length > 0) {
    const best = [...candidates].sort((a, b) => {
      const aDistance = Math.hypot(a.x - node.targetX, a.y - node.targetY) + a.penalty
      const bDistance = Math.hypot(b.x - node.targetX, b.y - node.targetY) + b.penalty
      return aDistance - bDistance
    })[0]
    node.x = best.x
    node.y = best.y
    return true
  }

  const pushLeft = rect.right - safe.x
  const pushRight = safe.x + safe.width - rect.left
  const pushUp = rect.bottom - safe.y
  const pushDown = safe.y + safe.height - rect.top

  if (profile.includes('mobile')) {
    if (node.band === 'top' || (node.y ?? node.targetY) < safeCenterY) {
      node.y = safe.y - node.visualHeight / 2 - 1
    } else if (node.band === 'bottom' || (node.y ?? node.targetY) >= safeCenterY) {
      node.y = safe.y + safe.height + node.visualHeight / 2 + 1
    } else if (Math.min(pushLeft, pushRight) < Math.min(pushUp, pushDown)) {
      node.x = (node.x ?? node.targetX) + (pushLeft < pushRight ? -pushLeft - 1 : pushRight + 1)
    } else {
      node.y = (node.y ?? node.targetY) + (pushUp < pushDown ? -pushUp - 1 : pushDown + 1)
    }
  } else {
    const horizontalPush = pushLeft < pushRight ? -pushLeft - 1 : pushRight + 1
    const verticalPush = pushUp < pushDown ? -pushUp - 1 : pushDown + 1
    if (
      node.band === 'left' ||
      node.band === 'right' ||
      Math.abs((node.x ?? node.targetX) - safeCenterX) > Math.abs((node.y ?? node.targetY) - safeCenterY)
    ) {
      node.x = (node.x ?? node.targetX) + horizontalPush
    } else {
      node.y = (node.y ?? node.targetY) + verticalPush
    }
  }

  clampNode(node, bounds)
  return true
}

function separatePair(
  first: HeroLayoutNode,
  second: HeroLayoutNode,
  bounds: HeroLayoutBounds,
  padding: number
) {
  const a = expandRect(nodeRect(first), padding / 2)
  const b = expandRect(nodeRect(second), padding / 2)
  if (!rectsOverlap(a, b)) return false

  const overlapX = Math.min(a.right - b.left, b.right - a.left)
  const overlapY = Math.min(a.bottom - b.top, b.bottom - a.top)

  if (overlapX < overlapY) {
    const direction = (first.x ?? 0) < (second.x ?? 0) ? -1 : 1
    distributePairSeparation(first, second, bounds, 'x', direction, overlapX)
  } else {
    const direction = (first.y ?? 0) < (second.y ?? 0) ? -1 : 1
    distributePairSeparation(first, second, bounds, 'y', direction, overlapY)
  }

  clampNode(first, bounds)
  clampNode(second, bounds)
  return true
}

function distributePairSeparation(
  first: HeroLayoutNode,
  second: HeroLayoutNode,
  bounds: HeroLayoutBounds,
  axis: 'x' | 'y',
  direction: number,
  overlap: number
) {
  const firstValue = first[axis] ?? (axis === 'x' ? first.targetX : first.targetY)
  const secondValue = second[axis] ?? (axis === 'x' ? second.targetX : second.targetY)
  const firstHalfSize = axis === 'x' ? first.visualWidth / 2 : first.visualHeight / 2
  const secondHalfSize = axis === 'x' ? second.visualWidth / 2 : second.visualHeight / 2
  const min = axis === 'x' ? bounds.minX : bounds.minY
  const max = axis === 'x' ? bounds.maxX : bounds.maxY
  const firstDesired = overlap * 0.5
  const secondDesired = overlap - firstDesired
  const firstRoom = direction < 0
    ? firstValue - (min + firstHalfSize)
    : (max - firstHalfSize) - firstValue
  const secondDirection = -direction
  const secondRoom = secondDirection < 0
    ? secondValue - (min + secondHalfSize)
    : (max - secondHalfSize) - secondValue
  const firstMove = Math.min(firstDesired, Math.max(0, firstRoom))
  const secondMove = Math.min(secondDesired + (firstDesired - firstMove), Math.max(0, secondRoom))
  const remaining = Math.max(0, overlap - firstMove - secondMove)
  const firstExtra = Math.min(remaining, Math.max(0, firstRoom - firstMove))

  first[axis] = firstValue + direction * (firstMove + firstExtra)
  second[axis] = secondValue + secondDirection * secondMove
}

function clampNode(node: HeroLayoutNode, bounds: HeroLayoutBounds) {
  const oldX = node.x ?? node.targetX
  const oldY = node.y ?? node.targetY
  node.x = clamp(oldX, bounds.minX + node.visualWidth / 2, bounds.maxX - node.visualWidth / 2)
  node.y = clamp(oldY, bounds.minY + node.visualHeight / 2, bounds.maxY - node.visualHeight / 2)
  return node.x !== oldX || node.y !== oldY
}

function centerWithinBounds(
  x: number,
  y: number,
  dimensions: { width: number; height: number },
  bounds: HeroLayoutBounds,
  band: HeroLayoutNode['band']
) {
  return {
    x: clamp(x, bounds.minX + dimensions.width / 2, bounds.maxX - dimensions.width / 2),
    y: clamp(y, bounds.minY + dimensions.height / 2, bounds.maxY - dimensions.height / 2),
    band
  }
}

function nodeRect(node: HeroLayoutNode) {
  const x = node.x ?? node.targetX
  const y = node.y ?? node.targetY

  return {
    x: x - node.visualWidth / 2,
    y: y - node.visualHeight / 2,
    width: node.visualWidth,
    height: node.visualHeight,
    left: x - node.visualWidth / 2,
    top: y - node.visualHeight / 2,
    right: x + node.visualWidth / 2,
    bottom: y + node.visualHeight / 2
  }
}

function unionRects(rects: readonly HeroRect[]): HeroRect {
  const left = Math.min(...rects.map((rect) => rect.x))
  const top = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function expandRect(rect: HeroRect, padding: number) {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    left: rect.x - padding,
    top: rect.y - padding,
    right: rect.x + rect.width + padding,
    bottom: rect.y + rect.height + padding
  }
}

function rectsOverlap(a: HeroLayoutRect, b: HeroLayoutRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function hashLayoutSeed(tags: readonly HeroFloatingTag[], viewport: HeroViewport, profile: HeroLayoutProfile) {
  return hashString(`${profile}:${Math.round(viewport.width)}x${Math.round(viewport.height)}:${tags.map((tag) => tag.name).join('|')}`)
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededUnit(seed: number) {
  return createSeededRandom(seed)()
}

function profileJitter(isMobile: boolean) {
  return isMobile ? 8 : 28
}

function lerp(min: number, max: number, amount: number) {
  return min + (max - min) * amount
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function roundPixel(value: number) {
  return roundValue(value, 0.1)
}

function roundValue(value: number, precision: number) {
  return Math.round(value / precision) * precision
}
