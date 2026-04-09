'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, AlertTriangle, Info, AlertCircle } from 'lucide-react'

interface Alert {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  timestamp: Date
}

interface AlertsPanelProps {
  alerts: Alert[]
  className?: string
}

export function AlertsPanel({ alerts, className }: AlertsPanelProps) {
  const getAlertConfig = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-destructive/10',
          textColor: 'text-destructive',
          borderColor: 'border-destructive/20',
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-warning/10',
          textColor: 'text-warning',
          borderColor: 'border-warning/20',
        }
      default:
        return {
          icon: Info,
          bgColor: 'bg-primary/10',
          textColor: 'text-primary',
          borderColor: 'border-primary/20',
        }
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <Card className={`bg-card/90 border-border/70 shadow-sm flex h-full min-h-0 flex-col ${className || ''}`}>
      <CardHeader className="pb-2 border-b border-border/60 bg-muted/20">
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-warning" />
          Alerts
          {alerts.length > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {alerts.length} total
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full min-h-[360px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Bell className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">No alerts yet</p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Alerts will appear here during your session
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4">
              {alerts.map((alert) => {
                const config = getAlertConfig(alert.type)
                const Icon = config.icon
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border ${config.bgColor} ${config.borderColor}`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.textColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${config.textColor}`}>{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(alert.timestamp)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
