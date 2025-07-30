"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Calendar,
  Download,
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Store
import { useReportsStore } from "@/lib/store/reportsStore";

// Utils
import { exportData } from "@/lib/utils/exportUtils";

// Types
import type { ComplianceMetrics } from "@/lib/types/reports";

// Sample data
const sampleComplianceMetrics: ComplianceMetrics = {
  totalChecks: 156,
  passedChecks: 142,
  failedChecks: 8,
  pendingChecks: 6,
  complianceScore: 91.0,
  criticalIssues: 2,
  resolvedIssues: 134,
  pendingIssues: 14,
  averageResolutionTime: 2.3,
  upcomingDeadlines: [
    {
      requirement: "Quarterly Gaming Commission Report",
      deadline: "2024-03-31",
      status: "on-track",
    },
    {
      requirement: "Anti-Money Laundering Review",
      deadline: "2024-02-15",
      status: "at-risk",
    },
    {
      requirement: "Security Audit Update",
      deadline: "2024-01-30",
      status: "overdue",
    },
  ],
};

const complianceCategories = [
  {
    category: "Gaming Regulations",
    passed: 45,
    failed: 2,
    pending: 1,
    score: 94,
  },
  {
    category: "Financial Compliance",
    passed: 38,
    failed: 1,
    pending: 2,
    score: 95,
  },
  {
    category: "Security Standards",
    passed: 32,
    failed: 3,
    pending: 1,
    score: 89,
  },
  { category: "Data Protection", passed: 27, failed: 2, pending: 2, score: 87 },
];

const recentAudits = [
  {
    id: "AUD001",
    type: "Internal Security Audit",
    date: "2024-01-15",
    auditor: "Security Team",
    status: "passed",
    findings: 3,
    severity: "low",
  },
  {
    id: "AUD002",
    type: "Gaming Commission Review",
    date: "2024-01-10",
    auditor: "External Auditor",
    status: "failed",
    findings: 7,
    severity: "high",
  },
  {
    id: "AUD003",
    type: "Financial Controls Check",
    date: "2024-01-08",
    auditor: "Internal Audit",
    status: "passed",
    findings: 1,
    severity: "low",
  },
];

export default function ComplianceTab() {
  const {
    complianceMetrics,
    updateComplianceMetrics,
    isLoading,
    setLoading,
    selectedDateRange,
  } = useReportsStore();

  const [activeSubTab, setActiveSubTab] = useState("overview");

  useEffect(() => {
    // Load compliance metrics when component mounts
    setLoading(true);
    setTimeout(() => {
      updateComplianceMetrics(sampleComplianceMetrics);
      setLoading(false);
    }, 1000);
  }, [updateComplianceMetrics, setLoading, selectedDateRange]);

  const handleExportData = async () => {
    try {
      const exportDataObj = {
        title: "Compliance Management Report",
        subtitle: "Regulatory compliance tracking and audit documentation",
        headers: [
          "Category",
          "Score (%)",
          "Passed Checks",
          "Failed Checks",
          "Pending Checks",
          "Status",
        ],
        data: complianceCategories.map((category) => [
          category.category,
          `${category.score}%`,
          category.passed.toString(),
          category.failed.toString(),
          category.pending.toString(),
          category.score >= 90
            ? "Excellent"
            : category.score >= 80
            ? "Good"
            : "Needs Attention",
        ]),
        summary: [
          {
            label: "Overall Compliance Score",
            value: `${metrics.complianceScore.toFixed(1)}%`,
          },
          {
            label: "Total Checks Passed",
            value: metrics.passedChecks.toString(),
          },
          {
            label: "Total Checks Failed",
            value: metrics.failedChecks.toString(),
          },
          {
            label: "Critical Issues",
            value: metrics.criticalIssues.toString(),
          },
          {
            label: "Resolved Issues",
            value: metrics.resolvedIssues.toString(),
          },
          { label: "Pending Issues", value: metrics.pendingIssues.toString() },
        ],
        metadata: {
          generatedBy: "Evolution1 CMS - Compliance Management",
          generatedAt: new Date().toISOString(),
          dateRange: selectedDateRange
            ? `${selectedDateRange.start?.toDateString()} - ${selectedDateRange.end?.toDateString()}`
            : "All time",
        },
      };

      await exportData(exportDataObj, "pdf");
      toast.success("Compliance management data exported successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Failed to export compliance data:", errorMessage);
      toast.error("Failed to export compliance data");
    }
  };

  const metrics = complianceMetrics || sampleComplianceMetrics;

  const kpiCards = [
    {
      title: "Compliance Score",
      value: `${metrics.complianceScore.toFixed(1)}%`,
      icon: Shield,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Passed Checks",
      value: metrics.passedChecks.toString(),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Failed Checks",
      value: metrics.failedChecks.toString(),
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Critical Issues",
      value: metrics.criticalIssues.toString(),
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Compliance Management
          </h2>
          <p className="text-gray-600">
            Monitor regulatory compliance and audit trails
          </p>
        </div>
        <Button onClick={handleExportData} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {kpi.value}
                    </p>
                    <p className="text-sm text-gray-600">{kpi.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs
        value={activeSubTab}
        onValueChange={setActiveSubTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-2 rounded-lg shadow-sm">
          <TabsTrigger
            value="overview"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="audits"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Recent Audits
          </TabsTrigger>
          <TabsTrigger
            value="deadlines"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Deadlines
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Compliance by Category
                </CardTitle>
                <CardDescription>
                  Compliance scores across different regulatory areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceCategories.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{category.category}</span>
                        <Badge
                          variant={
                            category.score >= 90
                              ? "default"
                              : category.score >= 80
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {category.score}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            category.score >= 90
                              ? "bg-green-500"
                              : category.score >= 80
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${category.score}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Passed: {category.passed}</span>
                        <span>Failed: {category.failed}</span>
                        <span>Pending: {category.pending}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Issue Resolution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Issue Resolution
                </CardTitle>
                <CardDescription>
                  Tracking of compliance issues and resolution times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Resolved Issues</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {metrics.resolvedIssues}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-medium">Critical Issues</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">
                      {metrics.criticalIssues}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Avg. Resolution Time</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {metrics.averageResolutionTime} days
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Audits
              </CardTitle>
              <CardDescription>
                Latest audit results and findings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAudits.map((audit) => (
                  <div
                    key={audit.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {audit.type}
                          </h3>
                          <Badge
                            variant={
                              audit.status === "passed"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {audit.status}
                          </Badge>
                          <Badge
                            variant={
                              audit.severity === "low"
                                ? "secondary"
                                : audit.severity === "medium"
                                ? "outline"
                                : "destructive"
                            }
                          >
                            {audit.severity} risk
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(audit.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Auditor:</span>{" "}
                            {audit.auditor}
                          </div>
                          <div>
                            <span className="font-medium">Findings:</span>{" "}
                            {audit.findings}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Deadlines
              </CardTitle>
              <CardDescription>
                Important compliance deadlines and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.upcomingDeadlines.map((deadline, index) => (
                  <div
                    key={index}
                    className={`p-4 border-l-4 rounded-lg ${
                      deadline.status === "on-track"
                        ? "border-l-green-500 bg-green-50"
                        : deadline.status === "at-risk"
                        ? "border-l-yellow-500 bg-yellow-50"
                        : "border-l-red-500 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {deadline.requirement}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Due:{" "}
                          {new Date(deadline.deadline).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          deadline.status === "on-track"
                            ? "default"
                            : deadline.status === "at-risk"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {deadline.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
