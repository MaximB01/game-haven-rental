import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle, Activity, Gamepad2, Globe, Bot, HardDrive } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'partial' | 'down' | 'unknown';
}

interface StatusData {
  services: ServiceStatus[];
  overall_status: string;
  last_updated: string;
}

const ServerStatusPage = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMessage);
      console.error('Error fetching service status:', err);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'partial':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-6 w-6 text-destructive" />;
      default:
        return <AlertCircle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return t('statusPage.operational');
      case 'degraded':
        return t('statusPage.degraded');
      case 'partial':
        return t('statusPage.partial');
      case 'down':
        return t('statusPage.down');
      default:
        return t('statusPage.unknown');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-500';
      case 'degraded':
      case 'partial':
        return 'text-yellow-500';
      case 'down':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getServiceIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('vps')) {
      return <HardDrive className="h-5 w-5" />;
    } else if (lowerName.includes('web')) {
      return <Globe className="h-5 w-5" />;
    } else if (lowerName.includes('bot')) {
      return <Bot className="h-5 w-5" />;
    } else {
      // Game servers or default
      return <Gamepad2 className="h-5 w-5" />;
    }
  };

  const overallStatus = data?.overall_status || 'unknown';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
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
          overallStatus === 'operational' ? 'border-green-500/50 bg-green-500/5' :
          overallStatus === 'degraded' || overallStatus === 'partial' ? 'border-yellow-500/50 bg-yellow-500/5' :
          overallStatus === 'down' ? 'border-destructive/50 bg-destructive/5' :
          ''
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(overallStatus)}
                <div>
                  <h2 className="text-xl font-semibold">{getStatusText(overallStatus)}</h2>
                  {data?.last_updated && (
                    <p className="text-sm text-muted-foreground">
                      {t('statusPage.lastUpdated')}: {new Date(data.last_updated).toLocaleTimeString()}
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

        {/* Services List */}
        {data && (
          <Card>
            <CardHeader>
              <CardTitle>{t('statusPage.services')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {data.services.map((service, index) => (
                  <div key={`${service.name}-${index}`} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        {getServiceIcon(service.name)}
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(service.status)}
                      <span className={`font-medium ${getStatusColor(service.status)}`}>
                        {getStatusText(service.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
