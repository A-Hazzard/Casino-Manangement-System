'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Download,
} from 'lucide-react';
import axios from 'axios';
type AuthMetrics = {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  activeSessions: number;
  lockedAccounts: number;
  suspiciousActivities: number;
};

type AuthEvent = {
  _id: string;
  action: string;
  details: string;
  success: boolean;
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

type AuthMonitoringDashboardProps = {
  userRole: string;
};

export function AuthMonitoringDashboard({
  userRole: _userRole,
}: AuthMonitoringDashboardProps) {
  const [metrics, setMetrics] = useState<AuthMetrics | null>(null);
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: 'all',
    success: 'all',
    timeRange: '24h',
    search: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.action !== 'all') params.append('action', filters.action);
      if (filters.success !== 'all') params.append('success', filters.success);
      if (filters.timeRange !== 'all')
        params.append('timeRange', filters.timeRange);
      if (filters.search) params.append('search', filters.search);

      const [metricsResponse, eventsResponse] = await Promise.all([
        axios.get(`/api/admin/auth/metrics?${params.toString()}`),
        axios.get(`/api/admin/auth/events?${params.toString()}`),
      ]);

      setMetrics(metricsResponse.data);
      setEvents(eventsResponse.data.events || []);
    } catch (err) {
      console.error('Failed to load auth monitoring data:', err);
      setError('Failed to load monitoring data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login_success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'login_failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'logout':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'token_refresh_success':
        return <RefreshCw className="h-4 w-4 text-green-500" />;
      case 'token_refresh_failed':
        return <RefreshCw className="h-4 w-4 text-red-500" />;
      case 'account_locked':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'suspicious_activity':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('success')) return 'bg-green-100 text-green-800';
    if (
      action.includes('failed') ||
      action.includes('locked') ||
      action.includes('suspicious')
    )
      return 'bg-red-100 text-red-800';
    if (action.includes('logout')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportData = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(
        `/api/admin/auth/export?${params.toString()}`,
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `auth-events-${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Authentication Monitoring</h1>
          <p className="text-gray-600">
            Monitor user authentication and security events
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Logins
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalLogins}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.successfulLogins}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.failedLogins}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Sessions
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.activeSessions}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Locked Accounts
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {metrics.lockedAccounts}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspicious</CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.suspiciousActivities}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Action</label>
              <Select
                value={filters.action}
                onValueChange={value =>
                  setFilters({ ...filters, action: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="login_success">Login Success</SelectItem>
                  <SelectItem value="login_failed">Login Failed</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="token_refresh">Token Refresh</SelectItem>
                  <SelectItem value="account_locked">Account Locked</SelectItem>
                  <SelectItem value="suspicious_activity">
                    Suspicious Activity
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.success}
                onValueChange={value =>
                  setFilters({ ...filters, success: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Time Range</label>
              <Select
                value={filters.timeRange}
                onValueChange={value =>
                  setFilters({ ...filters, timeRange: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by email, IP, or details..."
                value={filters.search}
                onChange={e =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Events</CardTitle>
          <CardDescription>
            Recent authentication and security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map(event => (
              <div key={event._id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getActionIcon(event.action)}
                    <div className="flex-1">
                      <div className="mb-1 flex items-center space-x-2">
                        <Badge className={getActionColor(event.action)}>
                          {event.action.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        {event.email && (
                          <span className="text-sm font-medium text-gray-900">
                            {event.email}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{event.details}</p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span>IP: {event.ipAddress}</span>
                        <span>{formatTimestamp(event.timestamp)}</span>
                        {event.metadata &&
                          Object.keys(event.metadata).length > 0 && (
                            <span>
                              Metadata: {Object.keys(event.metadata).length}{' '}
                              fields
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {events.length === 0 && !loading && (
              <div className="py-8 text-center text-gray-500">
                No events found matching your filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
