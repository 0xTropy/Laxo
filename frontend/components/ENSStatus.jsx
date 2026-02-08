'use client'

import { useState, useEffect } from 'react'
import { resolveENS } from '../lib/ens/pieWallet'

/**
 * Component to show ENS resolution status
 * Shows whether an ENS name resolves on-chain or is local-only
 */
export default function ENSStatus({ ensName, address }) {
  const [isResolved, setIsResolved] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!ensName) {
      setIsChecking(false)
      return
    }

    const checkResolution = async () => {
      setIsChecking(true)
      try {
        const resolvedAddress = await resolveENS(ensName)
        setIsResolved(resolvedAddress?.toLowerCase() === address?.toLowerCase())
      } catch (error) {
        console.error('Error checking ENS resolution:', error)
        setIsResolved(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkResolution()
  }, [ensName, address])

  if (!ensName) return null

  if (isChecking) {
    return (
      <span className="text-xs text-gray-500 flex items-center gap-1">
        <div className="animate-spin rounded-full h-2 w-2 border-b border-gray-400"></div>
        Checking ENS...
      </span>
    )
  }

  if (isResolved) {
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 flex items-center gap-1">
        <span>✓</span>
        <span>On-chain ENS</span>
      </span>
    )
  }

  return (
    <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 flex items-center gap-1" title="ENS name tracked locally. Register on-chain if you own the parent domain.">
      <span>ℹ️</span>
      <span>Local ENS</span>
    </span>
  )
}
