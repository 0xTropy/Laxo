'use client'

import { useState, useEffect } from 'react'
import { getBlockchainClient } from '../lib/blockchain/blockchainClient'

export default function BlockchainLogs({ isOpen, onClose }) {
  const [logs, setLogs] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState(null)
  const [filters, setFilters] = useState({
    showInfo: false, // Hide INFO logs by default
    showErrors: true,
    showEvents: true,
    showTransactions: true
  })

  useEffect(() => {
    if (!isOpen) return

    const client = getBlockchainClient()
    
    // Connect if not connected
    if (!client.isConnected) {
      client.connect().then(() => {
        setIsConnected(true)
        setStatus(client.getStatus())
      }).catch(err => {
        console.error('Failed to connect to blockchain:', err)
      })
    } else {
      setIsConnected(true)
      setStatus(client.getStatus())
    }

    // Update logs with filters applied
    const updateLogs = () => {
      const allLogs = client.getLogs(50)
      const filteredLogs = allLogs.filter((log) => {
        // Filter by level
        if (log.level === 'info' && !filters.showInfo) return false
        if (log.level === 'error' && !filters.showErrors) return false
        if (log.level === 'event' && !filters.showEvents) return false
        if (log.level === 'transaction' && !filters.showTransactions) return false
        
        return true
      })
      setLogs(filteredLogs)
    }
    updateLogs()

    // Listen for new logs
    const handleLog = () => {
      updateLogs()
    }
    client.on('log', handleLog)

    // Watch blocks
    let unwatchBlocks = null
    if (client.isConnected) {
      try {
        unwatchBlocks = client.watchBlocks((block) => {
          updateLogs()
        })
      } catch (err) {
        console.error('Failed to watch blocks:', err)
      }
    }

    // Initial update
    updateLogs()
    const interval = setInterval(updateLogs, 2000) // Update every 2 seconds

    return () => {
      client.off('log', handleLog)
      if (unwatchBlocks) {
        unwatchBlocks()
      }
      clearInterval(interval)
    }
  }, [isOpen, filters])

  const getLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'text-red-400'
      case 'event':
        return 'text-cyan-400'
      case 'transaction':
        return 'text-green-400'
      default:
        return 'text-gray-300'
    }
  }

  const getLevelBg = (level) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/20 border-red-500/50'
      case 'event':
        return 'bg-cyan-500/20 border-cyan-500/50'
      case 'transaction':
        return 'bg-green-500/20 border-green-500/50'
      default:
        return 'bg-laxo-bg border-laxo-border'
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-4 right-4 z-50 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full max-w-4xl h-[80vh] rounded-2xl border border-laxo-border bg-laxo-card shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-laxo-border">
            <div>
              <h2 className="font-display text-2xl font-bold text-white mb-1">
                Blockchain Logs
              </h2>
              {status && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-gray-400">
                      {status.chainName} (Chain ID: {status.chainId})
                    </span>
                  </div>
                  <span className="text-gray-500">
                    {logs.length} {logs.length === 1 ? 'log' : 'logs'} shown
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {logs.length > 0 && (
                <button
                  onClick={() => {
                    const client = getBlockchainClient()
                    client.clearLogs()
                    setLogs([])
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-400 border border-laxo-border bg-transparent transition hover:border-gray-500 hover:text-white hover:bg-laxo-bg"
                  title="Clear all logs"
                >
                  Clear Logs
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-laxo-bg hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-3 border-b border-laxo-border bg-laxo-bg/50">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-gray-500 font-semibold">Filters:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showInfo}
                  onChange={(e) => setFilters({ ...filters, showInfo: e.target.checked })}
                  className="w-4 h-4 rounded border-laxo-border bg-laxo-bg text-laxo-accent focus:ring-laxo-accent focus:ring-2"
                />
                <span className="text-xs text-gray-400">INFO</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showErrors}
                  onChange={(e) => setFilters({ ...filters, showErrors: e.target.checked })}
                  className="w-4 h-4 rounded border-laxo-border bg-laxo-bg text-laxo-accent focus:ring-laxo-accent focus:ring-2"
                />
                <span className="text-xs text-red-400">ERROR</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showEvents}
                  onChange={(e) => setFilters({ ...filters, showEvents: e.target.checked })}
                  className="w-4 h-4 rounded border-laxo-border bg-laxo-bg text-laxo-accent focus:ring-laxo-accent focus:ring-2"
                />
                <span className="text-xs text-cyan-400">EVENT</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showTransactions}
                  onChange={(e) => setFilters({ ...filters, showTransactions: e.target.checked })}
                  className="w-4 h-4 rounded border-laxo-border bg-laxo-bg text-laxo-accent focus:ring-laxo-accent focus:ring-2"
                />
                <span className="text-xs text-green-400">TRANSACTION</span>
              </label>
            </div>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {isConnected ? 'No logs yet. Blockchain activity will appear here.' : 'Connecting to blockchain...'}
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-lg border p-3 ${getLevelBg(log.level)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase ${getLevelColor(log.level)}`}>
                          {log.level}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-white mb-1">
                        {log.message}
                      </div>
                      {log.data && Object.keys(log.data).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                            View details
                          </summary>
                          <pre className="mt-2 text-xs text-gray-400 overflow-x-auto bg-laxo-bg/50 rounded p-2">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
