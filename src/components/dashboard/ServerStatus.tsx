import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Wifi, WifiOff, Cpu, HardDrive, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ServerStatusProps {
  identifier: string | null;
}

interface ServerResources {
  current_state: string;
  is_suspended: boolean;
  resources: {
    memory_bytes: number;
    memory_limit_bytes: number;
    cpu_absolute: number;
    disk_bytes: number;
    network_rx_bytes: number;
    network_tx_bytes: number;
    uptime: number;
  };
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatUptime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

const ServerStatus = ({ identifier }: ServerStatusProps) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ServerResources | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!identifier) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('get-server-status', {
        body: { identifier }
      });
      
      if (invokeError) {
        throw new Error(invokeError.message);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setStatus(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMessage);
      console.error('Error fetching server status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (identifier) {
      fetchStatus();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [identifier]);

  if (!identifier) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        {t('serverStatus.noServer')}
      </div>
    );
  }

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-destructive mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchStatus}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('serverStatus.retry')}
        </Button>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const memoryPercent = status.resources.memory_limit_bytes > 0 
    ? (status.resources.memory_bytes / status.resources.memory_limit_bytes) * 100 
    : 0;

  const getStateColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'default';
      case 'starting':
      case 'stopping':
        return 'secondary';
      case 'offline':
      case 'stopped':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status.current_state === 'running' ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-destructive" />
          )}
          <Badge variant={getStateColor(status.current_state)}>
            {status.current_state.toUpperCase()}
          </Badge>
          {status.is_suspended && (
            <Badge variant="destructive">SUSPENDED</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* CPU */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">CPU</span>
            </div>
            <p className="text-2xl font-bold">{status.resources.cpu_absolute.toFixed(1)}%</p>
            <Progress value={Math.min(status.resources.cpu_absolute, 100)} className="mt-2" />
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('serverStatus.memory')}</span>
            </div>
            <p className="text-2xl font-bold">{formatBytes(status.resources.memory_bytes)}</p>
            <Progress value={memoryPercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              / {formatBytes(status.resources.memory_limit_bytes)}
            </p>
          </CardContent>
        </Card>

        {/* Disk */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('serverStatus.disk')}</span>
            </div>
            <p className="text-2xl font-bold">{formatBytes(status.resources.disk_bytes)}</p>
          </CardContent>
        </Card>

        {/* Uptime */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('serverStatus.uptime')}</span>
            </div>
            <p className="text-2xl font-bold">{formatUptime(status.resources.uptime)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Stats */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-2">{t('serverStatus.network')}</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              ↓ {formatBytes(status.resources.network_rx_bytes)}
            </span>
            <span className="text-muted-foreground">
              ↑ {formatBytes(status.resources.network_tx_bytes)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServerStatus;