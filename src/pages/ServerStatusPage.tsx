import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Server, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ServerStatus {
  order_id: string;
  product_name: string;
  plan_name: string;
  identifier: string;
  current_state: string;
  is_suspended: boolean;
  server_name?: string;
  uptime?: number;
  error?: string;
}

interface StatusData {
  servers: ServerStatus[];
  stats: {
    total: number;
    running: number;
    offline: number;
    starting: number;
    error: number;
  };
}

const formatUptime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

const ServerStatusPage = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('get-all-servers-status');
      
      if (invokeError) {
        throw new Error(invokeError.message);
      }
      
      if (responseData.error) {
        throw new Error(responseData.error);
      }
      
      setData(responseData);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMessage);
      console.error('Error fetching server status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'running':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'starting':
      case 'stopping':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'offline':
      case 'stopped':
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStateBadgeVariant = (state: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (state) {
      case 'running':
        return 'default';
      case 'starting':
      case 'stopping':
        return 'secondary';
      case 'offline':
      case 'stopped':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getOverallStatus = () => {
    if (!data) return { status: 'unknown', message: t('statusPage.loading') };
    
    const { stats } = data;
    if (stats.error > 0) {
      return { status: 'degraded', message: t('statusPage.degraded') };
    }
    if (stats.running === stats.total && stats.total > 0) {
      return { status: 'operational', message: t('statusPage.operational') };
    }
    if (stats.running > 0) {
      return { status: 'partial', message: t('statusPage.partial') };
    }
    if (stats.total === 0) {
      return { status: 'none', message: t('statusPage.noServers') };
    }
    return { status: 'down', message: t('statusPage.down') };
  };

  const overall = getOverallStatus();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">{t('statusPage.title')}</h1>
          </div>
          <p className="text-muted-foreground">{t('statusPage.subtitle')}</p>
        </div>

        {/* Overall Status Banner */}
        <Card className={`mb-8 ${
          overall.status === 'operational' ? 'border-green-500/50 bg-green-500/5' :
          overall.status === 'degraded' ? 'border-yellow-500/50 bg-yellow-500/5' :
          overall.status === 'partial' ? 'border-yellow-500/50 bg-yellow-500/5' :
          overall.status === 'down' ? 'border-destructive/50 bg-destructive/5' :
          ''
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {overall.status === 'operational' && <CheckCircle className="h-8 w-8 text-green-500" />}
                {overall.status === 'degraded' && <AlertCircle className="h-8 w-8 text-yellow-500" />}
                {overall.status === 'partial' && <AlertCircle className="h-8 w-8 text-yellow-500" />}
                {overall.status === 'down' && <XCircle className="h-8 w-8 text-destructive" />}
                {overall.status === 'none' && <Server className="h-8 w-8 text-muted-foreground" />}
                {overall.status === 'unknown' && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
                <div>
                  <h2 className="text-xl font-semibold">{overall.message}</h2>
                  {lastUpdated && (
                    <p className="text-sm text-muted-foreground">
                      {t('statusPage.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={fetchStatus} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {t('serverStatus.refresh')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-green-500">{data.stats.running}</p>
                <p className="text-sm text-muted-foreground">{t('statusPage.online')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-muted-foreground">{data.stats.offline}</p>
                <p className="text-sm text-muted-foreground">{t('statusPage.offline')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-yellow-500">{data.stats.starting}</p>
                <p className="text-sm text-muted-foreground">{t('statusPage.starting')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-destructive">{data.stats.error}</p>
                <p className="text-sm text-muted-foreground">{t('statusPage.errors')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive mb-8">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={fetchStatus}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('serverStatus.retry')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Server List */}
        {data && data.servers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                {t('statusPage.servers')} ({data.servers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {data.servers.map((server) => (
                  <div key={server.order_id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStateIcon(server.current_state)}
                      <div>
                        <p className="font-medium">
                          {server.server_name || server.product_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {server.product_name} • {server.plan_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {server.uptime && server.uptime > 0 && (
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                          {t('serverStatus.uptime')}: {formatUptime(server.uptime)}
                        </span>
                      )}
                      <Badge variant={getStateBadgeVariant(server.current_state)}>
                        {server.current_state.toUpperCase()}
                      </Badge>
                      {server.is_suspended && (
                        <Badge variant="destructive">SUSPENDED</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Servers */}
        {data && data.servers.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('statusPage.noServers')}</p>
            </CardContent>
          </Card>
        )}

        {/* Auto-refresh notice */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          {t('statusPage.autoRefresh')}
        </p>
      </div>
    </Layout>
  );
};

export default ServerStatusPage;
