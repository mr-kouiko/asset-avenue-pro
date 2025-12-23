import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Shield,
  RefreshCw,
  AlertTriangle,
  Lock,
  Eye,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface SecurityAuditSummary {
  event_type: string;
  target_table: string;
  event_count: number;
  unique_users: number;
  first_occurrence: string;
  last_occurrence: string;
}

export const AdminSecurityLogs = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: auditSummary, isLoading, refetch } = useQuery({
    queryKey: ['admin-security-audit'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_security_audit_summary_admin');
      if (error) throw error;
      return data as SecurityAuditSummary[];
    }
  });

  const filteredLogs = auditSummary?.filter(log => 
    searchTerm === '' || 
    log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target_table?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('admin')) return <Shield className="h-4 w-4 text-yellow-500" />;
    if (eventType.includes('sensitive') || eventType.includes('CRITICAL')) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (eventType.includes('access')) return <Eye className="h-4 w-4 text-primary" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getEventBadge = (eventType: string) => {
    if (eventType.includes('CRITICAL')) return <Badge variant="destructive">Critique</Badge>;
    if (eventType.includes('admin')) return <Badge variant="default">Admin</Badge>;
    if (eventType.includes('sensitive')) return <Badge className="bg-orange-500">Sensible</Badge>;
    return <Badge variant="secondary">Info</Badge>;
  };

  const totalEvents = auditSummary?.reduce((sum, log) => sum + log.event_count, 0) || 0;
  const criticalEvents = auditSummary?.filter(log => log.event_type.includes('CRITICAL')).length || 0;
  const adminEvents = auditSummary?.filter(log => log.event_type.includes('admin')).length || 0;

  return (
    <div className="space-y-6">
      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total événements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Événements critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{criticalEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-500" />
              Accès admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-green-500" />
              État système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-500">Sécurisé</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Journal de sécurité
          </CardTitle>
          <CardDescription>
            Surveillance des accès et événements de sécurité
          </CardDescription>
          <div className="flex items-center gap-4 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher événements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-2">Chargement des logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun événement de sécurité</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {getEventIcon(log.event_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium font-mono text-sm">{log.event_type}</h4>
                        {getEventBadge(log.event_type)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Table: {log.target_table || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{log.event_count} événements</p>
                    <p className="text-sm text-muted-foreground">{log.unique_users} utilisateurs</p>
                    <p className="text-xs text-muted-foreground">
                      Dernier: {new Date(log.last_occurrence).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
