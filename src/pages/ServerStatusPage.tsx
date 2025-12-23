import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Gamepad2,
  Globe,
  Bot,
  HardDrive,
  Server,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "partial" | "down" | "unknown";
}

interface NodeStatus {
  id: number;
  name: string;
  location: string;
  status: "operational" | "down" | "maintenance" | "unknown";
  memory_used: number;
  memory_total: number;
  disk_used: number;
  disk_total: number;
}

interface StatusData {
  services: ServiceStatus[];
  nodes: NodeStatus[];
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
      const { data: responseData, error: invokeError } = await supabase.functions.invoke("get-all-servers-status");

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      setData(responseData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch status";
      setError(errorMessage);
      console.error("Error fetching service status:", err);
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
      case "operational":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "degraded":
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case "partial":
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case "maintenance":
        return <Wrench className="h-6 w-6 text-blue-500" />;
      case "down":
        return <XCircle className="h-6 w-6 text-destructive" />;
      default:
        return <AlertCircle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "operational":
        return t("statusPage.operational");
      case "degraded":
        return t("statusPage.degraded");
      case "partial":
        return t("statusPage.partial");
      case "maintenance":
        return "Onderhoud";
      case "down":
        return t("statusPage.down");
      default:
        return t("statusPage.unknown");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "text-green-500";
      case "degraded":
      case "partial":
        return "text-yellow-500";
      case "maintenance":
        return "text-blue-500";
      case "down":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getServiceIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("vps")) {
      return <HardDrive className="h-5 w-5" />;
    } else if (lowerName.includes("web")) {
      return <Globe className="h-5 w-5" />;
    } else if (lowerName.includes("bot")) {
      return <Bot className="h-5 w-5" />;
    } else {
      // Game servers or default
      return <Gamepad2 className="h-5 w-5" />;
    }
  };

  const formatBytes = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const getUsagePercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const overallStatus = data?.overall_status || "unknown";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">{t("statusPage.title")}</h1>
          </div>
          <p className="text-muted-foreground">{t("statusPage.subtitle")}</p>
        </div>

        {/* Overall Status Banner */}
        <Card
          className={`mb-8 ${
            overallStatus === "operational"
              ? "border-green-500/50 bg-green-500/5"
              : overallStatus === "degraded" || overallStatus === "partial"
                ? "border-yellow-500/50 bg-yellow-500/5"
                : overallStatus === "down"
                  ? "border-destructive/50 bg-destructive/5"
                  : ""
          }`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(overallStatus)}
                <div>
                  <h2 className="text-xl font-semibold">{getStatusText(overallStatus)}</h2>
                  {data?.last_updated && (
                    <p className="text-sm text-muted-foreground">
                      {t("statusPage.lastUpdated")}: {new Date(data.last_updated).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={fetchStatus} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {t("serverStatus.refresh")}
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
                {t("serverStatus.retry")}
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

        {data && (
          <div className="space-y-8">
            {/* Nodes Section */}
            {data.nodes && data.nodes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Nodes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {data.nodes.map((node) => {
                      const memoryPercent = getUsagePercentage(node.memory_used, node.memory_total);
                      const diskPercent = getUsagePercentage(node.disk_used, node.disk_total);

                      return (
                        <Card
                          key={node.id}
                          className={`${
                            node.status === "operational"
                              ? "border-green-500/30"
                              : node.status === "maintenance"
                                ? "border-blue-500/30"
                                : node.status === "down"
                                  ? "border-destructive/30"
                                  : "border-muted"
                          }`}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold">{node.name}</h3>
                                <p className="text-sm text-muted-foreground">{node.location}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(node.status)}
                                <span className={`text-sm font-medium ${getStatusColor(node.status)}`}>
                                  {getStatusText(node.status)}
                                </span>
                              </div>
                            </div>

                            {node.status === "operational" && (
                              <div className="space-y-3">
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-muted-foreground">Geheugen</span>
                                    <span>
                                      {formatBytes(node.memory_used)} / {formatBytes(node.memory_total)}
                                    </span>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${getProgressColor(memoryPercent)} transition-all`}
                                      style={{ width: `${memoryPercent}%` }}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-muted-foreground">Opslag</span>
                                    <span>
                                      {formatBytes(node.disk_used)} / {formatBytes(node.disk_total)}
                                    </span>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${getProgressColor(diskPercent)} transition-all`}
                                      style={{ width: `${diskPercent}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {node.status === "maintenance" && (
                              <p className="text-sm text-blue-500">
                                Deze node is momenteel in onderhoud. Servers op deze node kunnen tijdelijk onbereikbaar
                                zijn.
                              </p>
                            )}

                            {node.status === "down" && (
                              <p className="text-sm text-destructive">
                                Deze node is offline. Servers op deze node zijn momenteel niet bereikbaar.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services List */}
            <Card>
              <CardHeader>
                <CardTitle>{t("statusPage.services")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {data.services.map((service, index) => (
                    <div key={`${service.name}-${index}`} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">{getServiceIcon(service.name)}</div>
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
          </div>
        )}

        {/* Auto-refresh notice */}
        <p className="text-center text-sm text-muted-foreground mt-8">{t("statusPage.autoRefresh")}</p>
      </div>
    </Layout>
  );
};

export default ServerStatusPage;
