const cache = new Map<string, string>()

export async function resolvePds(did: string, fetch: typeof globalThis.fetch): Promise<string> {
  const cached = cache.get(did)
  if (cached) return cached

  let doc: { service?: { type: string; serviceEndpoint: string }[] }
  if (did.startsWith('did:web:')) {
    const domain = did.slice('did:web:'.length)
    const res = await fetch(`https://${domain}/.well-known/did.json`)
    if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`)
    doc = await res.json()
  } else {
    const plc = process.env.NODE_ENV === 'production' ? 'https://plc.directory' : 'http://localhost:2582'
    const res = await fetch(`${plc}/${did}`)
    if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`)
    doc = await res.json()
  }

  const svc = doc.service?.find(s => s.type === 'AtprotoPersonalDataServer')
  if (!svc?.serviceEndpoint) throw new Error(`No PDS found for DID: ${did}`)
  cache.set(did, svc.serviceEndpoint)
  return svc.serviceEndpoint
}

/** Build a blob URL from a PDS endpoint, DID, and BlobRef (or raw CID string). */
export function blobUrl(pds: string, did: string, ref: unknown): string | null {
  const cid =
    typeof ref === 'string'
      ? ref
      : (ref as any)?.ref?.['$link'] ?? null
  if (!cid) return null
  return `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`
}
