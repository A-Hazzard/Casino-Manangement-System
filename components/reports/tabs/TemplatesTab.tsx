"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Download,
  Star,
  Eye,
  Calendar,
  Users,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExportUtils } from "@/lib/utils/exportUtils";
import type { TemplateData } from "@/lib/types/components";

export default function TemplatesTab() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(
    null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const templates: TemplateData[] = [
    {
      id: 1,
      name: "Daily Revenue Report",
      category: "Financial",
      rating: 4.8,
      uses: 156,
      description:
        "Comprehensive daily revenue analysis with breakdowns by location, machine type, and time periods.",
      lastUpdated: "2024-01-15",
      author: "System",
      sections: [
        "Revenue Summary",
        "Location Performance",
        "Machine Analysis",
        "Trend Comparison",
      ],
      sampleData: {
        title: "Daily Revenue Report",
        subtitle: "Comprehensive revenue analysis for casino operations",
        headers: [
          "Location",
          "Revenue",
          "Machines",
          "Avg per Machine",
          "Hold %",
        ],
        data: [
          ["Main Casino Floor", "$45,230", "25", "$1,809", "8.7%"],
          ["VIP Gaming Area", "$32,150", "15", "$2,143", "9.2%"],
          ["Sports Bar Gaming", "$18,900", "12", "$1,575", "8.1%"],
          ["Hotel Gaming Lounge", "$12,400", "8", "$1,550", "7.9%"],
        ],
      },
    },
    {
      id: 2,
      name: "Machine Performance Summary",
      category: "Operational",
      rating: 4.6,
      uses: 89,
      description:
        "Detailed analysis of individual machine performance metrics and utilization rates.",
      lastUpdated: "2024-01-14",
      author: "Operations Team",
      sections: [
        "Performance Metrics",
        "Utilization Analysis",
        "Maintenance Schedule",
        "Revenue Optimization",
      ],
      sampleData: {
        title: "Machine Performance Summary",
        subtitle: "Individual machine performance and utilization analysis",
        headers: [
          "Machine ID",
          "Game Title",
          "Handle",
          "Win",
          "Hold %",
          "Utilization",
        ],
        data: [
          [
            "MAC001",
            "Lucky Stars Deluxe",
            "$125,000",
            "$10,875",
            "8.7%",
            "92%",
          ],
          ["MAC002", "Diamond Rush Pro", "$89,000", "$7,654", "8.6%", "88%"],
          ["MAC003", "Golden Jackpot", "$67,000", "$5,360", "8.0%", "85%"],
          ["MAC004", "Mega Fortune", "$45,000", "$3,600", "8.0%", "78%"],
        ],
      },
    },
    {
      id: 3,
      name: "Compliance Audit Report",
      category: "Compliance",
      rating: 4.9,
      uses: 67,
      description:
        "Regulatory compliance tracking and audit trail documentation for gaming operations.",
      lastUpdated: "2024-01-13",
      author: "Compliance Team",
      sections: [
        "Regulatory Status",
        "Audit Trail",
        "License Compliance",
        "Risk Assessment",
      ],
      sampleData: {
        title: "Compliance Audit Report",
        subtitle: "Regulatory compliance and audit documentation",
        headers: [
          "Requirement",
          "Status",
          "Last Check",
          "Next Due",
          "Risk Level",
        ],
        data: [
          [
            "Gaming License Renewal",
            "Current",
            "2024-01-01",
            "2025-01-01",
            "Low",
          ],
          [
            "Security System Audit",
            "Compliant",
            "2024-01-10",
            "2024-04-10",
            "Low",
          ],
          [
            "Financial Reporting",
            "Up to Date",
            "2024-01-15",
            "2024-02-15",
            "Low",
          ],
          [
            "Staff Training Records",
            "Current",
            "2024-01-05",
            "2024-07-05",
            "Medium",
          ],
        ],
      },
    },
    {
      id: 4,
      name: "Customer Analytics Report",
      category: "Analytics",
      rating: 4.7,
      uses: 124,
      description:
        "Customer behavior analysis, loyalty metrics, and demographic insights.",
      lastUpdated: "2024-01-12",
      author: "Analytics Team",
      sections: [
        "Customer Demographics",
        "Behavior Patterns",
        "Loyalty Analysis",
        "Revenue Attribution",
      ],
      sampleData: {
        title: "Customer Analytics Report",
        subtitle: "Customer behavior and loyalty analysis",
        headers: [
          "Segment",
          "Count",
          "Avg Spend",
          "Visits/Month",
          "Loyalty Score",
        ],
        data: [
          ["VIP Players", "45", "$2,350", "12", "9.2"],
          ["Regular Players", "234", "$450", "6", "7.8"],
          ["Casual Players", "567", "$125", "2", "5.4"],
          ["New Players", "89", "$75", "1", "6.1"],
        ],
      },
    },
  ];

  const handlePreviewTemplate = (template: TemplateData) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleUseTemplate = async (template: TemplateData) => {
    try {
      const exportData = {
        title: template.sampleData.title,
        subtitle: template.sampleData.subtitle,
        headers: template.sampleData.headers,
        data: template.sampleData.data,
        summary: [
          { label: "Template Used", value: template.name },
          { label: "Category", value: template.category },
          { label: "Generated At", value: new Date().toLocaleString() },
          {
            label: "Data Points",
            value: template.sampleData.data.length.toString(),
          },
        ],
        metadata: {
          generatedBy: "Evolution1 CMS - Template System",
          generatedAt: new Date().toISOString(),
          dateRange: "Current Period",
        },
      };

      await ExportUtils.exportData(exportData, "pdf");
      toast.success(`${template.name} generated successfully!`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to generate report from template:", errorMessage);
      }
      toast.error("Failed to generate report from template");
    }
  };

  const handleCreateTemplate = () => {
    // Create a new template with default values
    const newTemplate: TemplateData = {
      id: templates.length + 1,
      name: `Custom Template ${templates.length + 1}`,
      category: "Custom",
      rating: 5.0,
      uses: 0,
      description: "Custom template created by user",
      lastUpdated: new Date().toISOString().split("T")[0],
      author: "User",
      sections: ["Summary", "Detailed Analysis", "Recommendations"],
      sampleData: {
        title: `Custom Template ${templates.length + 1}`,
        subtitle: "User-generated custom report template",
        headers: ["Item", "Value", "Status"],
        data: [
          ["Sample Data 1", "Value 1", "Active"],
          ["Sample Data 2", "Value 2", "Pending"],
          ["Sample Data 3", "Value 3", "Completed"],
        ],
      },
    };

    // In a real implementation, this would save to the backend
    toast.success("Template created successfully! You can now customize it.");

    // Auto-select the new template for preview
    setSelectedTemplate(newTemplate);
    setIsPreviewOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Templates</h2>
          <p className="text-gray-600">
            Pre-built templates and custom report builder
          </p>
        </div>
        <Button
          onClick={handleCreateTemplate}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{template.name}</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm">{template.rating}</span>
                </div>
              </CardTitle>
              <CardDescription>
                <Badge variant="outline">{template.category}</Badge>
                <p className="text-sm text-gray-600 mt-2">
                  {template.description}
                </p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{template.uses} uses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(template.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  <span>By {template.author}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreviewTemplate(template)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Use Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Template Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Category
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedTemplate.category}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Rating
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    {selectedTemplate.rating}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Uses</div>
                  <div className="text-sm text-gray-600">
                    {selectedTemplate.uses}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Last Updated
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(
                      selectedTemplate.lastUpdated
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Template Sections */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Report Sections
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTemplate.sections.map(
                    (section: string, index: number) => (
                      <div
                        key={index}
                        className="p-2 bg-blue-50 rounded text-sm text-blue-900"
                      >
                        {section}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Sample Data Preview */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Sample Data Preview
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {selectedTemplate.sampleData.headers.map(
                          (header: string, index: number) => (
                            <th
                              key={index}
                              className="px-3 py-2 text-left font-medium text-gray-700"
                            >
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTemplate.sampleData.data
                        .slice(0, 3)
                        .map((row: string[], rowIndex: number) => (
                          <tr key={rowIndex} className="border-t">
                            {row.map((cell: string, cellIndex: number) => (
                              <td
                                key={cellIndex}
                                className="px-3 py-2 text-gray-600"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {selectedTemplate.sampleData.data.length > 3 && (
                    <div className="px-3 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                      ... and {selectedTemplate.sampleData.data.length - 3} more
                      rows
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleUseTemplate(selectedTemplate);
                    setIsPreviewOpen(false);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
