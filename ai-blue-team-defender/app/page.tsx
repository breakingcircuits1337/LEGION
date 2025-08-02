"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Shield, AlertTriangle, Activity, Zap, Brain, Network, Globe, FileText, Key, Users, Copy, Loader2 } from "lucide-react"
import { useChat } from "ai/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useToast } from "@/components/ui/toast"
import { ThemeToggle } from "@/components/ui/theme-toggle"

interface DefenderInstance {
  id: string
  name: string
  specialization: string
  status: "active" | "analyzing" | "responding"
  provider: string
  threatLevel: number
  lastAction: string
}

interface ApiKeys {
  groq: string
  gemini: string
  mistral: string
}

export default function BlueTeamDefender() {
  const [selectedProvider, setSelectedProvider] = useState("groq")
  const [threatLevel, setThreatLevel] = useState(2)
  const [activeIncidents, setActiveIncidents] = useState(3)
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ groq: "", gemini: "", mistral: "" })
  const [defenders, setDefenders] = useState<DefenderInstance[]>([])
  const [isDefendersActive, setIsDefendersActive] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const { toast } = useToast()

  // --- Real defense agent integration state ---
  const [agentRunning, setAgentRunning] = useState(false)
  const [runParams, setRunParams] = useState({
    provider: selectedProvider,
    apiKeys: apiKeys,
    task: "",
    maxSteps: 40,
  })
  const [streamData, setStreamData] = useState<{
    html: string
    finalResult: string
    errors: string
    traceUrl: string | null
  }>({
    html: "<h1 style='width:80vw; height:50vh'>Waiting for browser session...</h1>",
    finalResult: "",
    errors: "",
    traceUrl: null,
  })

  // Keep params in sync
  // (update if provider or apiKeys change)
  // eslint-disable-next-line
  if (runParams.provider !== selectedProvider || runParams.apiKeys !== apiKeys) {
    setRunParams({ ...runParams, provider: selectedProvider, apiKeys })
  }

  // --- Defense Agent Hook ---
  function useDefenseAgent() {
    const eventSourceRef = useRef<EventSource | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    // Start defense agent (opens stream, updates state as data comes in)
    async function start(params: any) {
      setAgentRunning(true)
      setStreamData({
        html: "<h1 style='width:80vw; height:50vh'>Launching agent…</h1>",
        finalResult: "",
        errors: "",
        traceUrl: null,
      })
      toast({ title: "Defense agent launched..." })
      // Use fetch + eventsource-parser for streaming
      const { createParser } = await import("eventsource-parser")
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await fetch("/api/defense/start", {
          method: "POST",
          body: JSON.stringify(params),
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        })
        if (!res.body) throw new Error("No response body")
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let html = ""
        let finalResult = ""
        let errors = ""
        let traceUrl: string | null = null
        const parser = createParser((event: any) => {
          if (event.type === "event" && event.data) {
            try {
              const arr = JSON.parse(event.data)
              // The Python yields: [html_content, final_result, errors, model_actions, model_thoughts, latest_videos, trace, history_file, stop_button, run_button]
              html = arr[0] || html
              finalResult = arr[1] || ""
              errors = arr[2] || ""
              traceUrl = arr[5] || arr[6] || null
              setStreamData({
                html,
                finalResult,
                errors,
                traceUrl,
              })
            } catch (e) {
              // ignore parse errors
            }
          }
        })
        // Read stream and feed parser
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          parser.feed(buffer)
          buffer = ""
        }
        setAgentRunning(false)
        toast({ title: "Defense completed" })
      } catch (err: any) {
        setAgentRunning(false)
        setStreamData(s => ({ ...s, errors: err.message || "Stream error" }))
        toast({ title: "Error", description: err.message, variant: "destructive" })
      }
    }

    // Stop defense agent
    async function stop() {
      setAgentRunning(false)
      abortRef.current?.abort()
      await fetch("/api/defense/stop", { method: "POST" })
    }

    return { start, stop }
  }

  const defenseAgent = useDefenseAgent()

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedKeys = localStorage.getItem("ai-defender-keys")
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys))
    }
  }, [])

  // Save API keys to localStorage
  const saveApiKeys = () => {
    localStorage.setItem("ai-defender-keys", JSON.stringify(apiKeys))
    setConfigOpen(false)
  }

  // Spawn multiple AI defenders when high threat detected
  const spawnDefenders = () => {
    const newDefenders: DefenderInstance[] = [
      {
        id: "defender-1",
        name: "Network Guardian",
        specialization: "Network Security & Traffic Analysis",
        status: "active",
        provider: "groq",
        threatLevel: 4,
        lastAction: "Analyzing network traffic patterns",
      },
      {
        id: "defender-2",
        name: "Web Shield",
        specialization: "Web Application Protection",
        status: "active",
        provider: "gemini",
        threatLevel: 4,
        lastAction: "Scanning for injection attacks",
      },
      {
        id: "defender-3",
        name: "Incident Responder",
        specialization: "Threat Intelligence & Response",
        status: "active",
        provider: "mistral",
        threatLevel: 4,
        lastAction: "Correlating threat indicators",
      },
    ]

    setDefenders(newDefenders)
    setIsDefendersActive(true)
    setThreatLevel(4)
    setActiveIncidents((prev) => prev + 1)

    // Simulate defender activities
    setTimeout(() => {
      setDefenders((prev) =>
        prev.map((d) => ({
          ...d,
          status: "analyzing" as const,
          lastAction: `${d.name} analyzing threat vectors...`,
        })),
      )
    }, 2000)

    setTimeout(() => {
      setDefenders((prev) =>
        prev.map((d) => ({
          ...d,
          status: "responding" as const,
          lastAction: `${d.name} implementing countermeasures...`,
        })),
      )
    }, 5000)

    toast({
      title: "Multi-Defender Activated",
      description: "Three AI defenders are now protecting your infrastructure.",
    })
  }

  // Deactivate defenders
  const deactivateDefenders = () => {
    setDefenders([])
    setIsDefendersActive(false)
    setThreatLevel(2)
    toast({
      title: "Defenders Deactivated",
      description: "Multi-defender protocol has been turned off.",
    })
  }

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/security-analysis",
    body: {
      provider: selectedProvider,
      apiKeys: apiKeys,
      multi: isDefendersActive,
      providers: isDefendersActive
        ? {
            network: defenders.find((d) => d.name === "Network Guardian")?.provider || "groq",
            web: defenders.find((d) => d.name === "Web Shield")?.provider || "gemini",
            incident: defenders.find((d) => d.name === "Incident Responder")?.provider || "mistral",
          }
        : undefined,
    },
  })

  const securityMetrics = [
    { name: "Network Security", value: isDefendersActive ? 95 : 85, status: isDefendersActive ? "excellent" : "good" },
    { name: "Web App Security", value: isDefendersActive ? 88 : 72, status: isDefendersActive ? "good" : "warning" },
    { name: "Endpoint Protection", value: isDefendersActive ? 97 : 91, status: "good" },
    { name: "Data Integrity", value: isDefendersActive ? 94 : 88, status: "good" },
  ]

  const recentThreats = [
    {
      id: 1,
      type: "Advanced Persistent Threat",
      severity: "Critical",
      source: "192.168.1.45",
      time: "1 min ago",
      status: isDefendersActive ? "neutralized" : "active",
    },
    {
      id: 2,
      type: "SQL Injection Attempt",
      severity: "High",
      source: "10.0.0.23",
      time: "3 min ago",
      status: "blocked",
    },
    {
      id: 3,
      type: "Port Scan",
      severity: "Medium",
      source: "172.16.0.12",
      time: "8 min ago",
      status: "monitored",
    },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "destructive"
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "default"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "neutralized":
        return "secondary"
      case "blocked":
        return "destructive"
      case "active":
        return "destructive"
      case "investigating":
        return "default"
      case "monitored":
        return "secondary"
      default:
        return "default"
    }
  }

  const getDefenderStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "analyzing":
        return "bg-yellow-100 text-yellow-800"
      case "responding":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className={`max-w-7xl mx-auto space-y-6 ${simulationActive && successCount > 0 ? "ring-4 ring-red-500/30" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className={`h-8 w-8 text-blue-600 ${threatLevel >= 4 || isDefendersActive ? "animate-pulse-fast" : ""}`} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI Blue Team Defender</h1>
              <p className="text-gray-600 dark:text-gray-300">Self-Replicating AI-Powered Security Defense System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Key className="h-4 w-4 mr-2" />
                  Configure APIs
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>API Configuration</DialogTitle>
                  <DialogDescription>
                    Enter your API keys for all AI providers to enable full functionality.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="groq-key">Groq API Key</Label>
                    <Input
                      id="groq-key"
                      type="password"
                      placeholder="Enter Groq API key..."
                      value={apiKeys.groq}
                      onChange={(e) => setApiKeys((prev) => ({ ...prev, groq: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gemini-key">Google Gemini API Key</Label>
                    <Input
                      id="gemini-key"
                      type="password"
                      placeholder="Enter Gemini API key..."
                      value={apiKeys.gemini}
                      onChange={(e) => setApiKeys((prev) => ({ ...prev, gemini: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mistral-key">Mistral API Key</Label>
                    <Input
                      id="mistral-key"
                      type="password"
                      placeholder="Enter Mistral API key..."
                      value={apiKeys.mistral}
                      onChange={(e) => setApiKeys((prev) => ({ ...prev, mistral: e.target.value }))}
                    />
                  </div>
                  <Button onClick={saveApiKeys} className="w-full">
                    Save Configuration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="groq">Groq (Fast)</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="mistral">Mistral AI</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant={threatLevel > 3 ? "destructive" : threatLevel > 1 ? "default" : "secondary"}>
              Threat Level: {threatLevel}/5
            </Badge>
            {isDefendersActive && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Users className="h-3 w-3 mr-1" />3 Defenders Active
              </Badge>
            )}
          </div>
        </div>

        {/* Threat Detection Alert */}
        {!isDefendersActive && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Critical Threat Detected</AlertTitle>
            <AlertDescription className="text-red-700">
              Advanced Persistent Threat identified. Recommend activating multi-defender protocol.
              <Button onClick={spawnDefenders} className="ml-4 bg-red-600 hover:bg-red-700" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Spawn Defenders
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Active Defenders Display */}
        {isDefendersActive && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Users className="h-5 w-5 mr-2" />
                Multi-Defender Protocol Active
              </CardTitle>
              <CardDescription className="text-green-700">
                Three specialized AI defenders are now protecting your infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {defenders.map((defender) => (
                  <div key={defender.id} className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{defender.name}</h3>
                      <Badge className={getDefenderStatusColor(defender.status)}>{defender.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{defender.specialization}</p>
                    <p className="text-xs text-gray-500 mb-2">Provider: {defender.provider}</p>
                    <p className="text-xs font-medium">{defender.lastAction}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Activity Level</span>
                        <span>{defender.threatLevel * 25}%</span>
                      </div>
                      <Progress value={defender.threatLevel * 25} className="h-1" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={deactivateDefenders} variant="outline" size="sm">
                  Deactivate Defenders
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{activeIncidents}</div>
              <p className="text-xs text-muted-foreground">
                {isDefendersActive ? "Under AI control" : "+2 from last hour"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network Status</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{isDefendersActive ? "Fortified" : "Secure"}</div>
              <p className="text-xs text-muted-foreground">
                {isDefendersActive ? "Multi-layer protection" : "All systems operational"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Defenders</CardTitle>
              <Brain className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{defenders.length}</div>
              <p className="text-xs text-muted-foreground">
                {isDefendersActive ? "Active instances" : "Ready to deploy"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{isDefendersActive ? "0.3s" : "1.2s"}</div>
              <p className="text-xs text-muted-foreground">
                {isDefendersActive ? "Multi-AI boost" : "Average response"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="defenders">Defenders</TabsTrigger>
            <TabsTrigger value="threats">Threats</TabsTrigger>
            <TabsTrigger value="analysis">Active Defense</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="webapp">Web Apps</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Security Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Security Posture</CardTitle>
                  <CardDescription>
                    {isDefendersActive
                      ? "Enhanced by multi-defender protocol"
                      : "Current security metrics across all systems"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {securityMetrics.map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{metric.name}</span>
                        <span className="font-medium">{metric.value}%</span>
                      </div>
                      <Progress
                        value={metric.value}
                        className={`h-2 ${metric.status === "warning" ? "bg-yellow-100" : "bg-green-100"}`}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Threats */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Threats</CardTitle>
                  <CardDescription>Latest security events detected</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentThreats.map((threat) => (
                      <div key={threat.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getSeverityColor(threat.severity)}>{threat.severity}</Badge>
                            <span className="font-medium">{threat.type}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Source: {threat.source} • {threat.time}
                          </div>
                        </div>
                        <Badge variant={getStatusColor(threat.status)}>{threat.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="defenders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>AI Defender Management</span>
                </CardTitle>
                <CardDescription>Deploy and manage multiple AI defenders for enhanced security</CardDescription>
              </CardHeader>
              <CardContent>
                {!isDefendersActive ? (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Defenders</h3>
                    <p className="text-gray-600 mb-4">Deploy multiple AI defenders to enhance your security posture</p>
                    <Button onClick={spawnDefenders} className="bg-blue-600 hover:bg-blue-700">
                      <Copy className="h-4 w-4 mr-2" />
                      Deploy Multi-Defender Protocol
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Active Defenders</h3>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {defenders.length} Active
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {defenders.map((defender) => (
                        <Card key={defender.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <Brain className="h-8 w-8 text-blue-600" />
                                <div>
                                  <h4 className="font-semibold">{defender.name}</h4>
                                  <p className="text-sm text-gray-600">{defender.specialization}</p>
                                </div>
                              </div>
                              <Badge className={getDefenderStatusColor(defender.status)}>{defender.status}</Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Provider:</span>
                                <span className="ml-2 font-medium">{defender.provider}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Threat Level:</span>
                                <span className="ml-2 font-medium">{defender.threatLevel}/5</span>
                              </div>
                            </div>

                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700">Last Action:</p>
                              <p className="text-sm text-gray-600">{defender.lastAction}</p>
                            </div>

                            <div className="mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Activity Level</span>
                                <span>{defender.threatLevel * 25}%</span>
                              </div>
                              <Progress value={defender.threatLevel * 25} className="h-2" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="flex justify-center">
                      <Button
                        onClick={deactivateDefenders}
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                      >
                        Deactivate All Defenders
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="threats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Threat Intelligence</CardTitle>
                <CardDescription>
                  {isDefendersActive
                    ? "Multi-AI enhanced threat monitoring"
                    : "Real-time threat monitoring and analysis"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className={isDefendersActive ? "border-green-200 bg-green-50" : ""}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{isDefendersActive ? "Enhanced Protection Active" : "Active Monitoring"}</AlertTitle>
                  <AlertDescription>
                    {isDefendersActive
                      ? "Three specialized AI defenders are actively protecting your network with coordinated threat response."
                      : "AI-powered threat detection is actively monitoring your network for suspicious activities."}
                  </AlertDescription>
                </Alert>
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Blocked Attacks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-red-600">{isDefendersActive ? "203" : "127"}</div>
                        <p className="text-sm text-gray-600">Last 24 hours</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Response Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">{isDefendersActive ? "0.3s" : "1.2s"}</div>
                        <p className="text-sm text-gray-600">Average detection</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">AI Accuracy</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{isDefendersActive ? "99.2%" : "96.0%"}</div>
                        <p className="text-sm text-gray-600">
                          False positive rate: {isDefendersActive ? "0.8%" : "4.0%"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="oblivion" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Oblivion Red Team Simulation</span>
                </CardTitle>
                <CardDescription>
                  Simulate relentless red-team attacks from Oblivion AI. See if your blue team defense holds!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <Button
                    onClick={() => simulationActive ? stopOblivionSimulation() : startOblivionSimulation()}
                    variant={simulationActive ? "destructive" : "default"}
                  >
                    {simulationActive ? "Stop Simulation" : "Engage Oblivion"}
                  </Button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {simulationActive ? "Simulation running..." : "Idle"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                    <CardHeader>
                      <CardTitle className="text-green-700 dark:text-green-200">Blocked Attacks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600 dark:text-green-200">{blockedCount}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
                    <CardHeader>
                      <CardTitle className="text-red-700 dark:text-red-200">Successful Breaches</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-200">{successCount}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Attack Intensity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Progress value={intensityLevel} className="h-2 flex-1" />
                        <span className="text-sm">{intensityLevel}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {simulationActive && successCount > 0 && !isDefendersActive && (
                  <Alert className="border-red-300 bg-red-100 dark:bg-red-900/30 dark:border-red-700 mb-6">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-900 dark:text-red-200">Oblivion Breach Warning</AlertTitle>
                    <AlertDescription className="text-red-800 dark:text-red-200">
                      Some attacks are succeeding! <strong>Activate your multi-defender protocol now.</strong>
                    </AlertDescription>
                  </Alert>
                )}
                <div>
                  <h3 className="font-semibold mb-2">Attack Feed</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {attackEvents.length === 0 && (
                      <div className="text-gray-500 dark:text-gray-400 text-sm">No attacks yet.</div>
                    )}
                    {attackEvents.map(event => (
                      <div
                        key={event.id}
                        className={`flex items-center justify-between p-3 border rounded-lg
                          ${event.success
                            ? "bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-700"
                            : "bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700"}
                        `}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={event.success ? "destructive" : "secondary"}>
                              {event.success ? "Breach" : "Blocked"}
                            </Badge>
                            <span className="font-medium">{event.vector}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Severity: {event.severity} • {event.time}
                          </div>
                        </div>
                        <span className={`text-xs font-bold ${event.success ? "text-red-600 dark:text-red-200" : "text-green-700 dark:text-green-200"}`}>
                          {event.success ? "⚠️" : "✔️"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analysis" className="space-y-6 relative">
            <Card className="relative">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Active Defense Control Panel</span>
                </CardTitle>
                <CardDescription>
                  Launch and control a real browser-based defense agent against live attackers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end mb-6"
                  onSubmit={e => {
                    e.preventDefault()
                    if (!agentRunning) defenseAgent.start(runParams)
                  }}
                >
                  <div className="space-y-4">
                    <Label htmlFor="defense-task">Defense Task</Label>
                    <Textarea
                      id="defense-task"
                      value={runParams.task}
                      placeholder="Describe the blue team defense task or scenario…"
                      onChange={e => setRunParams({ ...runParams, task: e.target.value })}
                      disabled={agentRunning}
                    />
                    <div className="flex gap-4 items-center">
                      <Label htmlFor="maxSteps">Max Steps</Label>
                      <input
                        id="maxSteps"
                        type="number"
                        min={1}
                        max={200}
                        step={1}
                        className="border rounded px-2 py-1 w-24 bg-background text-foreground"
                        value={runParams.maxSteps}
                        onChange={e => setRunParams({ ...runParams, maxSteps: Number(e.target.value) })}
                        disabled={agentRunning}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 items-center h-full">
                    <Button
                      type="submit"
                      disabled={agentRunning}
                      className="w-32"
                      variant="default"
                    >
                      {agentRunning ? "Running..." : "Start"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!agentRunning}
                      onClick={() => defenseAgent.stop()}
                      className="w-32"
                    >
                      Stop
                    </Button>
                  </div>
                </form>
                <div className="mb-6">
                  <div className="rounded border bg-background overflow-hidden" style={{ minHeight: "50vh", border: "2px solid #6366f1" }}>
                    {/* Live browser view */}
                    <div dangerouslySetInnerHTML={{ __html: streamData.html }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Final Result</Label>
                    <Textarea
                      value={streamData.finalResult}
                      readOnly
                      className="bg-muted text-foreground min-h-[90px]"
                    />
                  </div>
                  <div>
                    <Label>Errors</Label>
                    <Textarea
                      value={streamData.errors}
                      readOnly
                      className="bg-muted text-destructive min-h-[90px]"
                    />
                  </div>
                </div>
                {streamData.traceUrl && (
                  <div className="mt-4">
                    <a href={streamData.traceUrl} download className="underline text-blue-600 dark:text-blue-400">
                      Download Trace
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI Security Analysis</span>
                  {isDefendersActive && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Multi-AI Enhanced
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Get AI-powered insights and recommendations for your security posture</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Zap className="h-4 w-4" />
                    <span>Powered by {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}</span>
                    {isDefendersActive && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 font-medium">3 AI Defenders Active</span>
                      </>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="security-query">Security Analysis Query</Label>
                      <Textarea
                        id="security-query"
                        placeholder="Describe your security concern or paste logs for analysis..."
                        value={input}
                        onChange={handleInputChange}
                        className="min-h-[100px]"
                        disabled={isLoading}
                      />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full flex items-center justify-center">
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {isLoading ? "Analyzing..." : "Analyze Security Issue"}
                    </Button>
                  </form>

                  {messages.length > 0 && (
                    <div className="space-y-4 mt-6">
                  <h3 className="font-semibold">AI Analysis Results:</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {isLoading && (
                      <div className="relative">
                        <div className="h-32 animate-pulse bg-muted rounded absolute inset-0 z-10 opacity-80" />
                      </div>
                    )}
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg relative group ${
                          message.role === "user"
                            ? "bg-blue-50 border-l-4 border-blue-400 dark:bg-blue-900/40 dark:border-blue-700"
                            : "bg-gray-50 border-l-4 border-gray-400 dark:bg-zinc-900/40 dark:border-gray-700"
                        }`}
                      >
                        <div className="font-medium text-sm mb-2 flex items-center justify-between">
                          <span>
                            {message.role === "user" ? "Your Query:" : "AI Analysis:"}
                          </span>
                          {message.role === "assistant" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-70 hover:opacity-100 transition-opacity absolute top-2 right-2"
                              onClick={() => {
                                navigator.clipboard.writeText(message.content)
                                toast({ title: "Copied" })
                              }}
                              aria-label="Copy analysis"
                              tabIndex={0}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {message.role === "assistant" ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            className="prose prose-sm dark:prose-invert max-w-none"
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Network className="h-5 w-5" />
                  <span>Network Security</span>
                  {isDefendersActive && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Guardian Active
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Monitor and protect your network infrastructure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Network Monitoring</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Firewall Status</span>
                        <Badge variant="secondary">{isDefendersActive ? "Fortified" : "Active"}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>IDS/IPS</span>
                        <Badge variant="secondary">{isDefendersActive ? "AI-Enhanced" : "Monitoring"}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>VPN Connections</span>
                        <Badge variant="secondary">12 Active</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Network Segmentation</span>
                        <Badge variant="secondary">Configured</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Traffic Analysis</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Inbound Traffic</span>
                        <span className="font-mono">2.3 GB/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outbound Traffic</span>
                        <span className="font-mono">1.8 GB/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Blocked Connections</span>
                        <span className="font-mono text-red-600">{isDefendersActive ? "89" : "47"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Anomalous Patterns</span>
                        <span className="font-mono text-orange-600">{isDefendersActive ? "0" : "3"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webapp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Web Application Security</span>
                  {isDefendersActive && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Shield Active
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Protect your web applications from threats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">WAF Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="secondary" className="mb-2">
                          {isDefendersActive ? "AI-Enhanced" : "Active"}
                        </Badge>
                        <p className="text-sm text-gray-600">
                          {isDefendersActive ? "ML-powered blocking" : "Blocking malicious requests"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">SSL/TLS</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="secondary" className="mb-2">
                          Secure
                        </Badge>
                        <p className="text-sm text-gray-600">All certificates valid</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">OWASP Top 10</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="secondary" className="mb-2">
                          {isDefendersActive ? "AI-Protected" : "Protected"}
                        </Badge>
                        <p className="text-sm text-gray-600">All vulnerabilities covered</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Recent Web Attacks</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">SQL Injection</span>
                          <span className="text-sm text-gray-600 ml-2">
                            Blocked {isDefendersActive ? "23" : "15"} attempts
                          </span>
                        </div>
                        <Badge variant="destructive">High</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">XSS Attack</span>
                          <span className="text-sm text-gray-600 ml-2">
                            Blocked {isDefendersActive ? "12" : "8"} attempts
                          </span>
                        </div>
                        <Badge variant="default">Medium</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">CSRF</span>
                          <span className="text-sm text-gray-600 ml-2">
                            Blocked {isDefendersActive ? "7" : "3"} attempts
                          </span>
                        </div>
                        <Badge variant="secondary">Low</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Security Reports</span>
                </CardTitle>
                <CardDescription>Generate and view security reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 flex flex-col bg-transparent">
                      <FileText className="h-6 w-6 mb-2" />
                      <span>Daily Security Report</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col bg-transparent">
                      <AlertTriangle className="h-6 w-6 mb-2" />
                      <span>Incident Summary</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col bg-transparent">
                      <Activity className="h-6 w-6 mb-2" />
                      <span>Performance Metrics</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col bg-transparent">
                      <Users className="h-6 w-6 mb-2" />
                      <span>Defender Activity Report</span>
                    </Button>
                  </div>

                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertTitle>Automated Reporting</AlertTitle>
                    <AlertDescription>
                      Reports are automatically generated daily and sent to your security team.
                      {isDefendersActive && " Multi-defender insights included in enhanced reports."}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
