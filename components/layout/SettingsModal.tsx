"use client";

import { useState } from "react";
import {
  Settings,
  Bell,
  Globe,
  Palette,
  DollarSign,
  Shield,
  Cog,
  Save,
  RotateCcw,
  Moon,
  Sun,
  Monitor,
  Volume2,
  Mail,
  Computer,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore } from "@/lib/store/settingsStore";
import {
  CURRENCY_SYMBOLS,
  type Currency,
  type Language,
  type Region,
  type SettingsCategory,
} from "@/lib/types/settings";
import { toast } from "sonner";

export default function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("display");
  const [newIpAddress, setNewIpAddress] = useState("");

  const {
    settings,
    isLoading,
    hasUnsavedChanges,
    updateNotificationSettings,
    updateDisplaySettings,
    updateRegionalSettings,
    updateSecuritySettings,
    updateSystemSettings,
    saveSettings,
    resetSettings,
    resetCategory,
    setTheme,
    increaseFontSize,
    decreaseFontSize,
    formatCurrency,
    enableAllNotifications,
    disableAllNotifications,
    addToIpWhitelist,
    removeFromIpWhitelist,
  } = useSettingsStore();

  // Handle save with toast notifications
  const handleSave = async () => {
    try {
      await saveSettings();
      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  // Handle reset with confirmation
  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      resetSettings();
      toast.success("Settings reset to defaults");
    }
  };

  // Handle category reset
  const handleCategoryReset = (category: string) => {
    if (
      confirm(
        `Are you sure you want to reset ${category} settings to defaults?`
      )
    ) {
      resetCategory(category as SettingsCategory);
      toast.success(`${category} settings reset to defaults`);
    }
  };

  // Handle IP whitelist addition
  const handleAddIpAddress = () => {
    if (newIpAddress.trim()) {
      addToIpWhitelist(newIpAddress.trim());
      setNewIpAddress("");
      toast.success("IP address added to whitelist");
    }
  };

  // Currency options with symbols (limited for performance)
  const currencyOptions = [
    { value: "USD" as Currency, label: "USD ($)", symbol: "$" },
    { value: "EUR" as Currency, label: "EUR (€)", symbol: "€" },
    { value: "GBP" as Currency, label: "GBP (£)", symbol: "£" },
    { value: "CAD" as Currency, label: "CAD (C$)", symbol: "C$" },
    { value: "AUD" as Currency, label: "AUD (A$)", symbol: "A$" },
    { value: "JPY" as Currency, label: "JPY (¥)", symbol: "¥" },
    { value: "CHF" as Currency, label: "CHF (CHF)", symbol: "CHF" },
    { value: "CNY" as Currency, label: "CNY (¥)", symbol: "¥" },
    { value: "INR" as Currency, label: "INR (₹)", symbol: "₹" },
    { value: "BRL" as Currency, label: "BRL (R$)", symbol: "R$" },
  ];

  // Language options (limited for performance)
  const languageOptions = [
    { value: "en" as Language, label: "English" },
    { value: "es" as Language, label: "Español" },
    { value: "fr" as Language, label: "Français" },
    { value: "de" as Language, label: "Deutsch" },
    { value: "it" as Language, label: "Italiano" },
    { value: "pt" as Language, label: "Português" },
    { value: "ru" as Language, label: "Русский" },
    { value: "zh" as Language, label: "中文" },
    { value: "ja" as Language, label: "日本語" },
    { value: "ko" as Language, label: "한국어" },
  ];

  // Region options (limited for performance)
  const regionOptions = [
    { value: "US" as Region, label: "United States" },
    { value: "CA" as Region, label: "Canada" },
    { value: "GB" as Region, label: "United Kingdom" },
    { value: "DE" as Region, label: "Germany" },
    { value: "FR" as Region, label: "France" },
    { value: "IT" as Region, label: "Italy" },
    { value: "ES" as Region, label: "Spain" },
    { value: "AU" as Region, label: "Australia" },
    { value: "JP" as Region, label: "Japan" },
    { value: "BR" as Region, label: "Brazil" },
  ];

  return (
    <div className="z-[9999] relative">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Settings"
            className="group mb-2 mx-auto p-2 rounded hover:bg-buttonActive transition-colors"
          >
            <Settings className="w-6 h-6 text-grayHighlight group-hover:text-container" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Settings
            </DialogTitle>
            <DialogDescription>
              Customize your CMS experience with personalized settings.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full"
            >
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="display" className="flex items-center gap-1">
                  <Palette className="w-4 h-4" />
                  Display
                </TabsTrigger>
                <TabsTrigger value="regional" className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  Regional
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="flex items-center gap-1"
                >
                  <Bell className="w-4 h-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="currency" className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Currency
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-1">
                  <Cog className="w-4 h-4" />
                  System
                </TabsTrigger>
              </TabsList>

              <div className="mt-6 max-h-[60vh] overflow-y-auto">
                {/* Display Settings */}
                <TabsContent value="display" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Theme & Appearance
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategoryReset("display")}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Customize the visual appearance of the interface
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Theme Selection */}
                      <div className="space-y-2">
                        <Label>Theme</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={
                              settings.display.theme === "light"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => setTheme("light")}
                            className="flex items-center gap-2"
                          >
                            <Sun className="w-4 h-4" />
                            Light
                          </Button>
                          <Button
                            variant={
                              settings.display.theme === "dark"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => setTheme("dark")}
                            className="flex items-center gap-2"
                          >
                            <Moon className="w-4 h-4" />
                            Dark
                          </Button>
                          <Button
                            variant={
                              settings.display.theme === "system"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => setTheme("system")}
                            className="flex items-center gap-2"
                          >
                            <Monitor className="w-4 h-4" />
                            System
                          </Button>
                        </div>
                      </div>

                      {/* Font Size */}
                      <div className="space-y-2">
                        <Label>Font Size</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={decreaseFontSize}
                            disabled={settings.display.fontSize === "small"}
                          >
                            A-
                          </Button>
                          <Badge variant="secondary" className="px-3">
                            {settings.display.fontSize}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={increaseFontSize}
                            disabled={settings.display.fontSize === "large"}
                          >
                            A+
                          </Button>
                        </div>
                      </div>

                      {/* Display Options */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Compact Mode</Label>
                            <p className="text-sm text-muted-foreground">
                              Reduce spacing for more content
                            </p>
                          </div>
                          <Switch
                            checked={settings.display.compactMode}
                            onCheckedChange={(checked) =>
                              updateDisplaySettings({ compactMode: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Show Animations</Label>
                            <p className="text-sm text-muted-foreground">
                              Enable smooth transitions and animations
                            </p>
                          </div>
                          <Switch
                            checked={settings.display.showAnimations}
                            onCheckedChange={(checked) =>
                              updateDisplaySettings({ showAnimations: checked })
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Regional Settings */}
                <TabsContent value="regional" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Language & Region
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategoryReset("regional")}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Set your language, region, and formatting preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Language</Label>
                          <Select
                            value={settings.regional.language}
                            onValueChange={(value: Language) =>
                              updateRegionalSettings({ language: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {languageOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Region</Label>
                          <Select
                            value={settings.regional.region}
                            onValueChange={(value: Region) =>
                              updateRegionalSettings({ region: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {regionOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date Format</Label>
                          <Select
                            value={settings.regional.dateFormat}
                            onValueChange={(value) =>
                              updateRegionalSettings({
                                dateFormat: value as
                                  | "MM/DD/YYYY"
                                  | "DD/MM/YYYY"
                                  | "YYYY-MM-DD"
                                  | "DD-MM-YYYY"
                                  | "MM-DD-YYYY",
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MM/DD/YYYY">
                                MM/DD/YYYY
                              </SelectItem>
                              <SelectItem value="DD/MM/YYYY">
                                DD/MM/YYYY
                              </SelectItem>
                              <SelectItem value="YYYY-MM-DD">
                                YYYY-MM-DD
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Time Format</Label>
                          <Select
                            value={settings.regional.timeFormat}
                            onValueChange={(value: "12h" | "24h") =>
                              updateRegionalSettings({ timeFormat: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                              <SelectItem value="24h">24 Hour</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Currency Settings */}
                <TabsContent value="currency" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Currency & Formatting
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategoryReset("regional")}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Configure how monetary values are displayed throughout the
                        system
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label>Default Currency</Label>
                        <Select
                          value={settings.regional.currency}
                          onValueChange={(value: Currency) => {
                            const symbol = CURRENCY_SYMBOLS[value];
                            updateRegionalSettings({
                              currency: value,
                              currencySymbol: symbol,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencyOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Currency Position</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={
                              settings.regional.currencyPosition === "before"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              updateRegionalSettings({
                                currencyPosition: "before",
                              })
                            }
                          >
                            Before ({settings.regional.currencySymbol}100.00)
                          </Button>
                          <Button
                            variant={
                              settings.regional.currencyPosition === "after"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              updateRegionalSettings({
                                currencyPosition: "after",
                              })
                            }
                          >
                            After (100.00{settings.regional.currencySymbol})
                          </Button>
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Preview</h4>
                        <div className="space-y-1 text-sm">
                          <p>Currency: {formatCurrency(1234.56)}</p>
                          <p>Large Amount: {formatCurrency(1234567.89)}</p>
                          <p>Small Amount: {formatCurrency(0.99)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notification Settings */}
                <TabsContent value="notifications" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Notification Preferences
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={enableAllNotifications}
                          >
                            Enable All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={disableAllNotifications}
                          >
                            Disable All
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Configure how and when you receive notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(settings.notifications).map(
                        ([key, notification]) => (
                          <div key={key} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="capitalize">
                                  {key.replace(/([A-Z])/g, " $1").trim()}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Configure {key.toLowerCase()} notifications
                                </p>
                              </div>
                              <Switch
                                checked={notification.enabled}
                                onCheckedChange={(checked) =>
                                  updateNotificationSettings({
                                    [key]: { ...notification, enabled: checked },
                                  })
                                }
                              />
                            </div>

                            {notification.enabled && (
                              <div className="ml-4 flex gap-4">
                                <div className="flex items-center gap-2">
                                  <Volume2 className="w-4 h-4" />
                                  <Switch
                                    checked={notification.sound}
                                    onCheckedChange={(checked) =>
                                      updateNotificationSettings({
                                        [key]: {
                                          ...notification,
                                          sound: checked,
                                        },
                                      })
                                    }
                                  />
                                  <span className="text-sm">Sound</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Computer className="w-4 h-4" />
                                  <Switch
                                    checked={notification.desktop}
                                    onCheckedChange={(checked) =>
                                      updateNotificationSettings({
                                        [key]: {
                                          ...notification,
                                          desktop: checked,
                                        },
                                      })
                                    }
                                  />
                                  <span className="text-sm">Desktop</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  <Switch
                                    checked={notification.email}
                                    onCheckedChange={(checked) =>
                                      updateNotificationSettings({
                                        [key]: {
                                          ...notification,
                                          email: checked,
                                        },
                                      })
                                    }
                                  />
                                  <span className="text-sm">Email</span>
                                </div>
                              </div>
                            )}
                            <Separator />
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Security & Access</CardTitle>
                      <CardDescription>
                        Manage security settings and access controls
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Two-Factor Authentication</Label>
                            <p className="text-sm text-muted-foreground">
                              Add an extra layer of security to your account
                            </p>
                          </div>
                          <Switch
                            checked={settings.security.twoFactorAuth}
                            onCheckedChange={(checked) =>
                              updateSecuritySettings({ twoFactorAuth: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Login Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                              Get notified when someone logs into your account
                            </p>
                          </div>
                          <Switch
                            checked={settings.security.loginNotifications}
                            onCheckedChange={(checked) =>
                              updateSecuritySettings({
                                loginNotifications: checked,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Session Timeout (minutes)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[settings.security.sessionTimeout]}
                            onValueChange={(value) =>
                              updateSecuritySettings({ sessionTimeout: value[0] })
                            }
                            max={1440}
                            min={5}
                            step={5}
                            className="flex-1"
                          />
                          <Badge variant="secondary">
                            {settings.security.sessionTimeout}m
                          </Badge>
                        </div>
                      </div>

                      {/* IP Whitelist */}
                      <div className="space-y-2">
                        <Label>IP Whitelist</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter IP address"
                            value={newIpAddress}
                            onChange={(e) => setNewIpAddress(e.target.value)}
                          />
                          <Button onClick={handleAddIpAddress} size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {settings.security.ipWhitelist.map((ip, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-muted rounded"
                            >
                              <span className="font-mono text-sm">{ip}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromIpWhitelist(ip)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* System Settings */}
                <TabsContent value="system" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>System Preferences</CardTitle>
                      <CardDescription>
                        Configure system behavior and performance settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Auto Refresh</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically refresh data at regular intervals
                            </p>
                          </div>
                          <Switch
                            checked={settings.system.autoRefresh}
                            onCheckedChange={(checked) =>
                              updateSystemSettings({ autoRefresh: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Auto Save</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically save changes as you work
                            </p>
                          </div>
                          <Switch
                            checked={settings.system.autoSave}
                            onCheckedChange={(checked) =>
                              updateSystemSettings({ autoSave: checked })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Default Page Size</Label>
                        <Select
                          value={settings.system.defaultPageSize.toString()}
                          onValueChange={(value) =>
                            updateSystemSettings({
                              defaultPageSize: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 items</SelectItem>
                            <SelectItem value="25">25 items</SelectItem>
                            <SelectItem value="50">50 items</SelectItem>
                            <SelectItem value="100">100 items</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer with save/reset buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Unsaved changes
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset All
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading || !hasUnsavedChanges}
              >
                {isLoading ? (
                  <>Loading...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
