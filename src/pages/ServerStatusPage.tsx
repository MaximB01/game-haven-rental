import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Wifi, WifiOff, Cpu, HardDrive, Clock, MemoryStick, Server } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ServerResources {
  current_state: string;
  is_suspended: boolean;
  server_name?: string;
  resources: {
    memory_bytes: number;
    memory_limit_bytes: number;
    cpu_absolute: number;
    cpu_limit: number;
    disk_bytes: number;
    disk_limit_bytes: number;
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

const ServerStatusPage = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const identifier = searchParams.get('id');
  
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

  const memoryPercent = status?.resources.memory_limit_bytes 
    ? (status.resources.memory_bytes / status.resources.memory_limit_bytes) * 100 
    : 0;

  const cpuPercent = status?.resources.cpu_limit 
    ? (status.resources.cpu_absolute / status.resources.cpu_limit) * 100
    : status?.resources.cpu_absolute || 0;

  const diskPercent = status?.resources.disk_limit_bytes 
    ? (status.resources.disk_bytes / status.resources.disk_limit_bytes) * 100
    : 0;

  if (!identifier) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Server className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t('statusPage.noServer')}</h1>
          <p className="text-muted-foreground">{t('statusPage.noServerDesc')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Server className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-2xl">
                    {status?.server_name || t('statusPage.title')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    ID: {identifier}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={fetchStatus} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {t('serverStatus.refresh')}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {loading && !status && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={fetchStatus}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('serverStatus.retry')}
              </Button>
            </CardContent>
          </Card>
        )}

        {status && (
          <div className="space-y-6">
            {/* Status Banner */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-4">
                  {status.current_state === 'running' ? (
                    <Wifi className="h-8 w-8 text-green-500" />
                  ) : (
                    <WifiOff className="h-8 w-8 text-destructive" />
                  )}
                  <Badge 
                    variant={getStateColor(status.current_state)} 
                    className="text-lg px-4 py-2"
                  >
                    {status.current_state.toUpperCase()}
                  </Badge>
                  {status.is_suspended && (
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                      SUSPENDED
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resource Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* CPU */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">CPU</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold mb-2">
                    {status.resources.cpu_absolute.toFixed(1)}%
                  </p>
                  <Progress value={Math.min(cpuPercent, 100)} className="h-3" />
                  {status.resources.cpu_limit > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('statusPage.limit')}: {status.resources.cpu_limit}%
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Memory */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <MemoryStick className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{t('serverStatus.memory')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold mb-2">
                    {formatBytes(status.resources.memory_bytes)}
                  </p>
                  <Progress value={memoryPercent} className="h-3" />
                  {status.resources.memory_limit_bytes > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('statusPage.limit')}: {formatBytes(status.resources.memory_limit_bytes)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Disk */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{t('serverStatus.disk')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold mb-2">
                    {formatBytes(status.resources.disk_bytes)}
                  </p>
                  <Progress value={diskPercent} className="h-3" />
                  {status.resources.disk_limit_bytes > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('statusPage.limit')}: {formatBytes(status.resources.disk_limit_bytes)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Uptime */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{t('serverStatus.uptime')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {formatUptime(status.resources.uptime)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Network Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('serverStatus.network')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('statusPage.download')}</p>
                    <p className="text-2xl font-bold">
                      ↓ {formatBytes(status.resources.network_rx_bytes)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('statusPage.upload')}</p>
                    <p className="text-2xl font-bold">
                      ↑ {formatBytes(status.resources.network_tx_bytes)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto-refresh notice */}
            <p className="text-center text-sm text-muted-foreground">
              {t('statusPage.autoRefresh')}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ServerStatusPage;
