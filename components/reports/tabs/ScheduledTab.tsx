"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Calendar,
  Play,
  Pause,
  Trash2,
  Bell,
  Users,
  FileText,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Removed unused import
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Store
import { useReportsStore } from "@/lib/store/reportsStore";

// Types
import type { ScheduledReport } from "@/lib/types/reports";

// Gaming Day configuration as mentioned in meeting notes
const gamingDayConfig = {
  startTime: "06:00", // 6 AM
  endTime: "06:00", // 6 AM next day
  timezone: "America/New_York",
};

// Sample scheduled reports with automated email functionality
const sampleScheduledReports: ScheduledReport[] = [
  {
    id: "SCH001",
    name: "Daily GLI Compliance Report",
    config: {
      title: "Daily GLI Compliance Report",
      reportType: "machineRevenue",
      category: "compliance",
      dateRange: {
        start: new Date(),
        end: new Date(),
      },
      timeGranularity: "daily",
      filters: {
        complianceStatus: ["requires_attention", "failed"],
      },
      fields: ["machine", "location", "event_type", "compliance_status"],
      chartType: "table",
      exportFormat: "pdf",
      includeCharts: true,
      includeSummary: true,
    },
    schedule: {
      frequency: "daily",
      time: "07:00",
      timezone: "America/New_York",
      enabled: true,
    },
    recipients: [
      {
        email: "compliance@casino.com",
        role: "Compliance Manager",
        deliveryMethod: "email",
      },
      {
        email: "operations@casino.com",
        role: "Operations Director",
        deliveryMethod: "email",
      },
    ],
    lastRun: "2024-01-20T07:00:00Z",
    nextRun: "2024-01-21T07:00:00Z",
    status: "active",
    createdBy: "admin",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "SCH002",
    name: "Weekly Machine Performance Summary",
    config: {
      title: "Weekly Machine Performance Summary",
      reportType: "machineRevenue",
      category: "operational",
      dateRange: {
        start: new Date(),
        end: new Date(),
      },
      timeGranularity: "weekly",
      filters: {},
      fields: ["machine", "location", "net_win", "drop", "hold_percentage"],
      chartType: "bar",
      exportFormat: "excel",
      includeCharts: true,
      includeSummary: true,
    },
    schedule: {
      frequency: "weekly",
      time: "08:00",
      dayOfWeek: 1, // Monday
      timezone: "America/New_York",
      enabled: true,
    },
    recipients: [
      {
        email: "management@casino.com",
        role: "Casino Manager",
        deliveryMethod: "email",
      },
      {
        email: "analysts@casino.com",
        role: "Data Analysts",
        deliveryMethod: "email",
      },
    ],
    lastRun: "2024-01-15T08:00:00Z",
    nextRun: "2024-01-22T08:00:00Z",
    status: "active",
    createdBy: "manager",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "SCH003",
    name: "Monthly Revenue & Drop Analysis",
    config: {
      title: "Monthly Revenue & Drop Analysis with Gaming Day Alignment",
      reportType: "locationPerformance",
      category: "financial",
      dateRange: {
        start: new Date(),
        end: new Date(),
      },
      timeGranularity: "monthly",
      filters: {},
      fields: [
        "location",
        "gross_revenue",
        "drop",
        "cancelled_credits",
        "gaming_day_metrics",
      ],
      chartType: "line",
      exportFormat: "pdf",
      includeCharts: true,
      includeSummary: true,
    },
    schedule: {
      frequency: "monthly",
      time: "09:00",
      dayOfMonth: 1,
      timezone: "America/New_York",
      enabled: false, // Paused
    },
    recipients: [
      {
        email: "finance@casino.com",
        role: "Finance Director",
        deliveryMethod: "email",
      },
      {
        email: "executives@casino.com",
        role: "Executive Team",
        deliveryMethod: "email",
      },
    ],
    nextRun: "2024-02-01T09:00:00Z",
    status: "paused",
    createdBy: "finance_admin",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const reportTypes = [
  {
    id: "compliance",
    label: "GLI Compliance Report",
    description: "Events browser and compliance monitoring",
  },
  {
    id: "meters",
    label: "Meters Export",
    description: "Raw machine meter data export",
  },
  {
    id: "comparison",
    label: "Performance Comparison",
    description: "Theoretical vs actual performance",
  },
  {
    id: "location-evaluation",
    label: "Location Evaluation",
    description: "SAS machine performance tracking",
  },
  {
    id: "location-revenue",
    label: "Location Revenue",
    description: "Non-SAS machine revenue with graphs",
  },
  {
    id: "offline-machines",
    label: "Offline Machines",
    description: "Monitor offline machine status",
  },
];

export default function ScheduledTab() {
  const { isLoading, setLoading } = useReportsStore();
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(
    []
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // Commented out unused variables
  // const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form state for creating/editing scheduled reports
  const [formData, setFormData] = useState({
    name: "",
    reportType: "",
    frequency: "daily",
    time: "07:00",
    timezone: gamingDayConfig.timezone,
    dayOfWeek: 1,
    dayOfMonth: 1,
    recipients: [""],
    includeCharts: true,
    includeSummary: true,
    exportFormat: "pdf",
    enabled: true,
  });

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setScheduledReports(sampleScheduledReports);
      setLoading(false);
    }, 1000);
  }, [setLoading]);

  const handleCreateReport = () => {
    if (!formData.name || !formData.reportType) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newReport: ScheduledReport = {
      id: `SCH${String(scheduledReports.length + 1).padStart(3, "0")}`,
      name: formData.name,
      config: {
        title: formData.name,
        reportType: formData.reportType as
          | "machineRevenue"
          | "locationPerformance"
          | "customerActivity",
        category: "operational",
        dateRange: {
          start: new Date(),
          end: new Date(),
        },
        timeGranularity:
          formData.frequency === "daily"
            ? "daily"
            : formData.frequency === "weekly"
            ? "weekly"
            : "monthly",
        filters: {},
        fields: [],
        chartType: "table",
        exportFormat: formData.exportFormat as "pdf" | "excel" | "csv",
        includeCharts: formData.includeCharts,
        includeSummary: formData.includeSummary,
      },
      schedule: {
        frequency: formData.frequency as "daily" | "weekly" | "monthly",
        time: formData.time,
        timezone: formData.timezone,
        dayOfWeek:
          formData.frequency === "weekly" ? formData.dayOfWeek : undefined,
        dayOfMonth:
          formData.frequency === "monthly" ? formData.dayOfMonth : undefined,
        enabled: formData.enabled,
      },
      recipients: formData.recipients
        .filter((email) => email.trim())
        .map((email) => ({
          email: email.trim(),
          role: "User",
          deliveryMethod: "email" as const,
        })),
      nextRun: calculateNextRun(formData),
      status: formData.enabled ? "active" : "paused",
      createdBy: "current_user",
      createdAt: new Date().toISOString(),
    };

    setScheduledReports((prev) => [...prev, newReport]);
    setIsCreateModalOpen(false);
    resetForm();
    toast.success("Scheduled report created successfully");
  };

  const calculateNextRun = (data: typeof formData): string => {
    const now = new Date();
    const [hours, minutes] = data.time.split(":").map(Number);

    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    if (data.frequency === "daily") {
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else if (data.frequency === "weekly") {
      const dayDiff = (data.dayOfWeek - nextRun.getDay() + 7) % 7;
      nextRun.setDate(nextRun.getDate() + dayDiff);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
    } else if (data.frequency === "monthly") {
      nextRun.setDate(data.dayOfMonth);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }

    return nextRun.toISOString();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      reportType: "",
      frequency: "daily",
      time: "07:00",
      timezone: gamingDayConfig.timezone,
      dayOfWeek: 1,
      dayOfMonth: 1,
      recipients: [""],
      includeCharts: true,
      includeSummary: true,
      exportFormat: "pdf",
      enabled: true,
    });
  };

  const handleToggleStatus = (reportId: string) => {
    setScheduledReports((prev) =>
      prev.map((report) =>
        report.id === reportId
          ? {
              ...report,
              status: report.status === "active" ? "paused" : "active",
              schedule: {
                ...report.schedule,
                enabled: report.status !== "active",
              },
            }
          : report
      )
    );
    toast.success("Report status updated");
  };

  const handleDeleteReport = (reportId: string) => {
    setScheduledReports((prev) =>
      prev.filter((report) => report.id !== reportId)
    );
    toast.success("Scheduled report deleted");
  };

  const handleRunNow = (reportId: string) => {
    const report = scheduledReports.find((r) => r.id === reportId);
    if (report) {
      // Simulate running the report
      toast.success(`Running "${report.name}" report now...`);
      // In real implementation, this would trigger the report generation
    }
  };

  const addRecipient = () => {
    setFormData((prev) => ({
      ...prev,
      recipients: [...prev.recipients, ""],
    }));
  };

  const updateRecipient = (index: number, email: string) => {
    setFormData((prev) => ({
      ...prev,
      recipients: prev.recipients.map((r, i) => (i === index ? email : r)),
    }));
  };

  const removeRecipient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="scheduled" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
          <TabsTrigger value="gaming-day">Gaming Day Config</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">
                Automated Report Scheduling
              </h3>
              <p className="text-sm text-muted-foreground">
                Schedule reports to be automatically generated and emailed at
                specific times
              </p>
            </div>
            <Dialog
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Scheduled Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Scheduled Report</DialogTitle>
                  <DialogDescription>
                    Set up an automated report to be generated and emailed on a
                    schedule
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Report Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Enter report name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reportType">Report Type</Label>
                      <Select
                        value={formData.reportType}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            reportType: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          {reportTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {type.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select
                        value={formData.frequency}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, frequency: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.time}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            time: e.target.value,
                          }))
                        }
                      />
                    </div>
                    {formData.frequency === "weekly" && (
                      <div>
                        <Label htmlFor="dayOfWeek">Day of Week</Label>
                        <Select
                          value={formData.dayOfWeek.toString()}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              dayOfWeek: parseInt(value),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Sunday</SelectItem>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {formData.frequency === "monthly" && (
                      <div>
                        <Label htmlFor="dayOfMonth">Day of Month</Label>
                        <Input
                          id="dayOfMonth"
                          type="number"
                          min="1"
                          max="31"
                          value={formData.dayOfMonth}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              dayOfMonth: parseInt(e.target.value),
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Email Recipients</Label>
                    <div className="space-y-2">
                      {formData.recipients.map((email, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) =>
                              updateRecipient(index, e.target.value)
                            }
                            placeholder="Enter email address"
                          />
                          {formData.recipients.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeRecipient(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addRecipient}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Recipient
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="exportFormat">Export Format</Label>
                      <Select
                        value={formData.exportFormat}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            exportFormat: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="excel">Excel</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeCharts"
                          checked={formData.includeCharts}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              includeCharts: !!checked,
                            }))
                          }
                        />
                        <Label htmlFor="includeCharts">Include Charts</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeSummary"
                          checked={formData.includeSummary}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              includeSummary: !!checked,
                            }))
                          }
                        />
                        <Label htmlFor="includeSummary">Include Summary</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateReport}>
                    Create Scheduled Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Scheduled Reports List */}
          <div className="grid gap-4">
            {scheduledReports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">{report.name}</CardTitle>
                        <CardDescription>
                          {report.schedule.frequency.charAt(0).toUpperCase() +
                            report.schedule.frequency.slice(1)}{" "}
                          at {report.schedule.time}
                          {report.schedule.timezone &&
                            ` (${report.schedule.timezone})`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          report.status === "active"
                            ? "default"
                            : report.status === "paused"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {report.status}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunNow(report.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(report.id)}
                        >
                          {report.status === "active" ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Report Details
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>Type: {report.config.reportType}</p>
                        <p>
                          Format: {report.config.exportFormat.toUpperCase()}
                        </p>
                        <p>
                          Charts: {report.config.includeCharts ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Recipients ({report.recipients.length})
                      </h4>
                      <div className="text-sm space-y-1">
                        {report.recipients
                          .slice(0, 2)
                          .map((recipient, index) => (
                            <p key={index}>{recipient.email}</p>
                          ))}
                        {report.recipients.length > 2 && (
                          <p className="text-muted-foreground">
                            +{report.recipients.length - 2} more
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule Info
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>
                          Last Run:{" "}
                          {report.lastRun
                            ? new Date(report.lastRun).toLocaleString()
                            : "Never"}
                        </p>
                        <p>
                          Next Run: {new Date(report.nextRun).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {scheduledReports.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  No Scheduled Reports
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create your first automated report to get started
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Scheduled Report
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Execution History
              </CardTitle>
              <CardDescription>
                Track the execution history and delivery status of scheduled
                reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Execution history will be displayed here once reports start
                running
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaming-day" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gaming Day Configuration</CardTitle>
              <CardDescription>
                Configure the operating hours for accurate daily reporting as
                mentioned in meeting requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="start-time">Gaming Day Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={gamingDayConfig.startTime}
                    readOnly
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    When the gaming day begins
                  </p>
                </div>
                <div>
                  <Label htmlFor="end-time">Gaming Day End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={gamingDayConfig.endTime}
                    readOnly
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    When the gaming day ends (next day)
                  </p>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={gamingDayConfig.timezone}
                    readOnly
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Timezone for all scheduled reports
                  </p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">
                  Gaming Day Concept
                </h4>
                <p className="text-sm text-blue-800">
                  The gaming day runs from 6 AM to 6 AM the next day, ensuring
                  accurate daily reporting that aligns with casino operations.
                  All scheduled reports will use this configuration for date
                  range calculations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
