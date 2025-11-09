import React, { useEffect, useState, useRef } from 'react'
import { getScrapingStatus, getScrapingLogs, triggerScrape, enableScheduler, disableScheduler } from '../api/client'
import type { ScrapingStatus, ScrapingLog } from '../types'

export function ScrapingManagement() {
  const [status, setStatus] = useState<ScrapingStatus | null>(null)
  const [logs, setLogs] = useState<ScrapingLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [manualScrapeKind, setManualScrapeKind] = useState<'flat' | 'house'>('flat')
  const [manualScrapePages, setManualScrapePages] = useState(2)
  const [schedulerHour, setSchedulerHour] = useState(2)
  const [schedulerMinute, setSchedulerMinute] = useState(0)
  const [isTogglingScheduler, setIsTogglingScheduler] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const fetchStatus = async () => {
    try {
      const data = await getScrapingStatus()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch scraping status:', error)
    }
  }

  const fetchLogs = async () => {
    try {
      const data = await getScrapingLogs(200)
      setLogs(data.logs)
    } catch (error) {
      console.error('Failed to fetch scraping logs:', error)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchLogs()
    
    // Poll for updates every 2 seconds if scraping is running
    const interval = setInterval(() => {
      fetchStatus()
      if (status?.status === 'running') {
        fetchLogs()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [status?.status])

  // Auto-scroll logs to bottom only if user is already near the bottom
  useEffect(() => {
    if (logsEndRef.current && logs.length > 0) {
      const logsContainer = logsEndRef.current.parentElement
      if (logsContainer) {
        const isNearBottom = logsContainer.scrollHeight - logsContainer.scrollTop - logsContainer.clientHeight < 100
        if (isNearBottom) {
          logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }
  }, [logs])

  const handleManualScrape = async () => {
    setIsLoading(true)
    try {
      await triggerScrape(manualScrapeKind, manualScrapePages)
      // Refresh status after a short delay
      setTimeout(() => {
        fetchStatus()
        fetchLogs()
      }, 1000)
    } catch (error) {
      console.error('Failed to trigger scrape:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'N/A'
    try {
      const date = new Date(timeStr)
      return date.toLocaleString()
    } catch {
      return timeStr
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#007bff'
      case 'completed':
        return '#28a745'
      case 'error':
        return '#dc3545'
      default:
        return '#6c757d'
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#dc3545'
      case 'warning':
        return '#ffc107'
      case 'info':
        return '#007bff'
      case 'debug':
        return '#6c757d'
      default:
        return '#000'
    }
  }

  if (!status) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
        <p>Loading scraping status...</p>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--spacing-lg)',
        gap: 'var(--spacing-lg)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Status Card */}
      <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
        <h2 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>
          Scraping Status
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>
              Status
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: getStatusColor(status.status) }}>
              {status.status.toUpperCase()}
            </div>
          </div>
          
          {status.current_kind && (
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>
                Current Type
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {status.current_kind}
              </div>
            </div>
          )}
          
          {status.total_pages > 0 && (
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>
                Progress
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                Page {status.current_page} / {status.total_pages}
              </div>
            </div>
          )}
          
          {status.items_processed > 0 && (
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>
                Items Processed
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {status.items_processed}
              </div>
            </div>
          )}
        </div>

        {status.status === 'running' && status.total_pages > 0 && (
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
              <span>Progress</span>
              <span>{Math.round(status.progress_percentage)}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '24px',
                backgroundColor: '#e9ecef',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${status.progress_percentage}%`,
                  height: '100%',
                  backgroundColor: '#007bff',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {status.start_time && (
          <div style={{ marginTop: 'var(--spacing-md)', fontSize: '13px', color: 'var(--color-text-light)' }}>
            Started: {formatTime(status.start_time)}
          </div>
        )}

        {status.end_time && (
          <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--color-text-light)' }}>
            Ended: {formatTime(status.end_time)}
          </div>
        )}

        {status.error_message && (
          <div
            style={{
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-sm)',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            <strong>Error:</strong> {status.error_message}
          </div>
        )}

        {status.scheduler_enabled && status.next_scheduled_run && (
          <div
            style={{
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-sm)',
              backgroundColor: '#d1ecf1',
              color: '#0c5460',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            <strong>Next scheduled run:</strong> {formatTime(status.next_scheduled_run)}
          </div>
        )}

        {!status.scheduler_enabled && (
          <div
            style={{
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-sm)',
              backgroundColor: '#fff3cd',
              color: '#856404',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            Scheduler is disabled
          </div>
        )}
      </div>

      {/* Scheduler Controls */}
      <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>
          Scheduled Scraping
        </h3>
        {status.scheduler_enabled ? (
          <div>
            <div style={{ marginBottom: 'var(--spacing-md)', fontSize: '14px', color: '#28a745' }}>
              ✓ Scheduled scraping is <strong>enabled</strong>
              {status.next_scheduled_run && (
                <div style={{ marginTop: '4px', fontSize: '13px', color: '#666' }}>
                  Next run: {formatTime(status.next_scheduled_run)}
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                setIsTogglingScheduler(true)
                try {
                  await disableScheduler()
                  await fetchStatus()
                } catch (error) {
                  console.error('Failed to disable scheduler:', error)
                } finally {
                  setIsTogglingScheduler(false)
                }
              }}
              disabled={isTogglingScheduler}
              style={{
                padding: '10px 20px',
                backgroundColor: isTogglingScheduler ? '#6c757d' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isTogglingScheduler ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {isTogglingScheduler ? 'Disabling...' : 'Disable Scheduled Scraping'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 'var(--spacing-md)', fontSize: '14px', color: '#856404' }}>
              Scheduled scraping is <strong>disabled</strong>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
              <div style={{ flex: '1', minWidth: '100px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--color-text-light)' }}>
                  Hour (0-23)
                </label>
                <input
                  type="number"
                  className="select-modern"
                  value={schedulerHour}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedulerHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={23}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: '1', minWidth: '100px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--color-text-light)' }}>
                  Minute (0-59)
                </label>
                <input
                  type="number"
                  className="select-modern"
                  value={schedulerMinute}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedulerMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={59}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <button
              onClick={async () => {
                setIsTogglingScheduler(true)
                try {
                  await enableScheduler(schedulerHour, schedulerMinute)
                  await fetchStatus()
                } catch (error) {
                  console.error('Failed to enable scheduler:', error)
                } finally {
                  setIsTogglingScheduler(false)
                }
              }}
              disabled={isTogglingScheduler}
              style={{
                padding: '10px 20px',
                backgroundColor: isTogglingScheduler ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isTogglingScheduler ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {isTogglingScheduler ? 'Enabling...' : `Enable Scheduled Scraping (${schedulerHour.toString().padStart(2, '0')}:${schedulerMinute.toString().padStart(2, '0')})`}
            </button>
          </div>
        )}
      </div>

      {/* Manual Scrape Controls */}
      <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>
          Manual Scrape
        </h3>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--color-text-light)' }}>
              Type
            </label>
            <select
              className="select-modern"
              value={manualScrapeKind}
              onChange={(e) => setManualScrapeKind(e.target.value as 'flat' | 'house')}
              style={{ width: '100%' }}
            >
              <option value="flat">Flats</option>
              <option value="house">Houses</option>
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--color-text-light)' }}>
              Pages
            </label>
            <input
              type="number"
              className="select-modern"
              value={manualScrapePages}
              onChange={(e) => setManualScrapePages(parseInt(e.target.value) || 1)}
              min={1}
              max={50}
              style={{ width: '100%' }}
            />
          </div>
          <button
            onClick={handleManualScrape}
            disabled={isLoading || status.status === 'running'}
            style={{
              padding: '10px 20px',
              backgroundColor: status.status === 'running' ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: status.status === 'running' ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {isLoading ? 'Starting...' : 'Start Scrape'}
          </button>
        </div>
      </div>

      {/* Logs */}
      <div
        className="card"
        style={{
          minHeight: '300px',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>
          Scraping Logs ({logs.length})
        </h3>
        <div
          style={{
            flex: 1,
            minHeight: '200px',
            overflow: 'auto',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: 'var(--spacing-md)',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.5',
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#6c757d' }}>No logs available</div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '4px',
                  color: getLogLevelColor(log.level),
                }}
              >
                <span style={{ color: '#6c757d' }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                  [{log.level.toUpperCase()}]
                </span>
                <span style={{ marginLeft: '8px' }}>{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  )
}

