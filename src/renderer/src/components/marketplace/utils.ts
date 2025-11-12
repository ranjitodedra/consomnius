import type { MarketplaceServer } from '@shared/types/marketplace'
import type { MCPServer } from '@renderer/types'

// Extract a minimal signature from a marketplace server's config
function extractSignatureFromMarketplace(server: MarketplaceServer): { command?: string; registryUrl?: string } {
  const cfg: any = server?.config
  if (!cfg) return {}

  let extracted: any = {}
  try {
    if (cfg && typeof cfg === 'object' && cfg.mcpServers && typeof cfg.mcpServers === 'object') {
      const keys = Object.keys(cfg.mcpServers)
      if (keys.length > 0) extracted = cfg.mcpServers[keys[0]] || {}
    } else if (Array.isArray(cfg) && cfg.length > 0) {
      extracted = cfg[0] || {}
    } else if (cfg && typeof cfg === 'object') {
      extracted = cfg
    }
  } catch {}

  const command: string | undefined = typeof extracted?.command === 'string' ? extracted.command : undefined
  const registryUrl: string | undefined =
    typeof extracted?.registryUrl === 'string'
      ? extracted.registryUrl
      : typeof (server as any)?.repository === 'string'
        ? (server as any).repository
        : undefined
  return { command, registryUrl }
}

export function isMarketplaceInstalled(server: MarketplaceServer, mcpServers: MCPServer[]): boolean {
  // 1) Strong match via marketplaceId
  const byId = mcpServers.some((s) => s.meta?.marketplaceId && server.id && s.meta?.marketplaceId === server.id)
  if (byId) return true

  // 2) Legacy heuristic: require name + author + matching command (to reduce collisions)
  const expected = extractSignatureFromMarketplace(server)
  if (!expected.command) return false

  return mcpServers.some((s) => {
    if (s.name !== server.name) return false
    if (server.author && s.provider !== server.author) return false
    if (s.command !== expected.command) return false
    // If we have a registryUrl on both, require equality too
    const sReg = (s as any).registryUrl as string | undefined
    if (expected.registryUrl && sReg) return sReg === expected.registryUrl
    return true
  })
}

export function findLegacyInstalledCandidate(server: MarketplaceServer, mcpServers: MCPServer[]): MCPServer | undefined {
  const expected = extractSignatureFromMarketplace(server)
  if (!expected.command) return undefined
  return mcpServers.find((s) => {
    if (s.meta?.marketplaceId) return false
    if (s.name !== server.name) return false
    if (server.author && s.provider !== server.author) return false
    if (s.command !== expected.command) return false
    const sReg = (s as any).registryUrl as string | undefined
    if (expected.registryUrl && sReg) return sReg === expected.registryUrl
    return true
  })
}

