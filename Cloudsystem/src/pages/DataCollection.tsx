import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, FileText, Database, ArrowLeft, Save, Trash2, Globe, FileJson,
  Table as TableIcon, Check, AlertCircle, RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Dataset {
  id: string;
  name: string;
  description: string;
  json_data: any;
  file_size: number;
  status: string;
  created_at: string;
}

const DataCollection = () => {
  const [activeTab, setActiveTab] = useState("file");
  // File Upload State
  const [jsonData, setJsonData] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"json" | "csv" | null>(null);

  // API State
  const [apiUrl, setApiUrl] = useState("");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiHeaders, setApiHeaders] = useState("{}");
  const [apiBody, setApiBody] = useState("");
  const [isFetchingApi, setIsFetchingApi] = useState(false);

  // Common State
  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDatasets();
    }
  }, [user]);

  const fetchDatasets = async () => {
    try {
      const data = await api.datasets.list();
      setDatasets(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load datasets",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const csvToJson = (csv: string) => {
    const lines = csv.split("\n");
    const result = [];
    const headers = lines[0].split(",");

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const obj: any = {};
      const currentline = lines[i].split(",");

      for (let j = 0; j < headers.length; j++) {
        if (headers[j]) {
          obj[headers[j].trim()] = currentline[j]?.trim();
        }
      }
      result.push(obj);
    }
    return result;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);

      const fileExt = file.name.split('.').pop()?.toLowerCase();

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          if (fileExt === 'json') {
            const parsed = JSON.parse(content);
            setJsonData(JSON.stringify(parsed, null, 2));
            setFileType("json");
            toast({ title: "JSON Loaded Successfully", description: `${file.name} (JSON) loaded.` });
          } else if (fileExt === 'csv') {
            const parsed = csvToJson(content);
            setJsonData(JSON.stringify(parsed, null, 2));
            setFileType("csv");
            toast({ title: "CSV Conversion Successful", description: `${file.name} (CSV) converted to JSON.` });
          } else {
            toast({ title: "Unsupported File", description: "Only JSON or CSV files are supported.", variant: "destructive" });
            return;
          }
        } catch (error) {
          toast({
            title: "File Processing Error",
            description: "An error occurred while parsing the file.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleApiFetch = async () => {
    if (!apiUrl) {
      toast({ title: "URL Required", description: "Please enter the API URL.", variant: "destructive" });
      return;
    }

    setIsFetchingApi(true);

    try {
      let headers = {};
      let body = undefined;

      try {
        headers = JSON.parse(apiHeaders || "{}");
      } catch (e) {
        toast({ title: "Header Error", description: "Header is not valid JSON.", variant: "destructive" });
        setIsFetchingApi(false);
        return;
      }

      if (apiBody) {
        try {
          body = JSON.parse(apiBody);
        } catch (e) {
          toast({ title: "Body Error", description: "Body is not valid JSON.", variant: "destructive" });
          setIsFetchingApi(false);
          return;
        }
      }

      const data = await api.proxy.fetch({
        url: apiUrl, method: apiMethod, headers, body
      });

      setJsonData(JSON.stringify(data, null, 2));
      setDatasetName(`API Import: ${new URL(apiUrl).hostname}`);
      setDatasetDescription(`Imported from ${apiUrl} at ${new Date().toLocaleString()}`);

      toast({ title: "API Data Received", description: "Successfully retrieved data." });

    } catch (error: any) {
      toast({ title: "API Request Failed", description: error.message || "Unknown error occurred.", variant: "destructive" });
    } finally {
      setIsFetchingApi(false);
    }
  };

  const handleDataSubmit = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to save data.",
        variant: "destructive",
      });
      return;
    }

    if (!jsonData.trim() || !datasetName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please check dataset name and data.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const parsedData = JSON.parse(jsonData);

      await api.datasets.create({
        name: datasetName,
        description: datasetDescription,
        json_data: parsedData,
        file_size: jsonData.length,
        uploaded_by: user.id
      });

      toast({
        title: "Dataset Saved Successfully",
        description: `${datasetName} has been saved.`,
      });

      // Reset
      setDatasetName("");
      setDatasetDescription("");
      setFileName("");
      setFileType(null);
      fetchDatasets();

    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Link>
            <div className="flex items-center space-x-2">
              <Database className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Data Collection Studio
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Data Collection & Integration</h1>
            <p className="text-lg text-muted-foreground">
              Collect data from various sources (Files, APIs) to prepare for ontology construction.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-muted/50 rounded-xl">
                <TabsTrigger value="file" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300">
                  <FileText className="h-4 w-4 mr-2" />
                  File Upload (JSON/CSV)
                </TabsTrigger>
                <TabsTrigger value="api" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300">
                  <Globe className="h-4 w-4 mr-2" />
                  API Connection
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column: Input Source */}
              <div className="space-y-6">
                <TabsContent value="file" className="mt-0 space-y-6 animate-fade-in">
                  <Card className="border-dashed border-2 shadow-none bg-muted/10 hover:bg-muted/20 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Upload className="h-5 w-5 mr-2 text-primary" />
                        Import File
                      </CardTitle>
                      <CardDescription>
                        Select JSON or CSV files to automatically convert.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-background hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Upload className="h-10 w-10 text-muted-foreground mb-4 group-hover:scale-110 transition-transform duration-300" />
                        <Label htmlFor="file-upload" className="text-lg font-medium cursor-pointer mb-2">
                          Select File or Drag & Drop
                        </Label>
                        <p className="text-sm text-muted-foreground">Supported formats: .json, .csv</p>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".json,.csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>

                      {fileName && (
                        <div className="mt-4 flex items-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                          {fileType === 'csv' ? <TableIcon className="h-5 w-5 mr-3 text-green-600" /> : <FileJson className="h-5 w-5 mr-3 text-orange-600" />}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{fileName}</p>
                            <p className="text-xs text-muted-foreground uppercase">{fileType} File Processed</p>
                          </div>
                          <Check className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="api" className="mt-0 space-y-6 animate-fade-in">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Globe className="h-5 w-5 mr-2 text-primary" />
                        API Connection
                      </CardTitle>
                      <CardDescription>
                        Fetch data via external REST API calls.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Select value={apiMethod} onValueChange={setApiMethod}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="https://api.example.com/data"
                          value={apiUrl}
                          onChange={(e) => setApiUrl(e.target.value)}
                          className="flex-1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Headers (JSON)</Label>
                        <Textarea
                          placeholder='{"Authorization": "Bearer token"}'
                          className="font-mono text-xs min-h-[80px]"
                          value={apiHeaders}
                          onChange={(e) => setApiHeaders(e.target.value)}
                        />
                      </div>

                      {apiMethod !== "GET" && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Body (JSON)</Label>
                          <Textarea
                            placeholder='{"key": "value"}'
                            className="font-mono text-xs min-h-[100px]"
                            value={apiBody}
                            onChange={(e) => setApiBody(e.target.value)}
                          />
                        </div>
                      )}

                      <Button
                        onClick={handleApiFetch}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        disabled={isFetchingApi}
                      >
                        {isFetchingApi ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                        Fetch API Data
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>

              {/* Right Column: Data Preview & Save */}
              <div className="space-y-6">
                <Card className="h-full flex flex-col shadow-sm border-muted">
                  <CardHeader className="pb-3 border-b bg-muted/30">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Data Preview & Save</span>
                      {jsonData && <Badge variant="secondary">Ready to Save</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 p-0 flex flex-col min-h-[400px]">
                    <div className="p-4 border-b bg-muted/10 space-y-4">
                      <div>
                        <Label>Dataset Name</Label>
                        <Input
                          placeholder="e.g., Gangnam Population 2024"
                          value={datasetName}
                          onChange={(e) => setDatasetName(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div>
                        <Label>Description (Optional)</Label>
                        <Input
                          placeholder="Description of the dataset"
                          value={datasetDescription}
                          onChange={(e) => setDatasetDescription(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                    </div>

                    <div className="flex-1 p-0 relative">
                      <Textarea
                        value={jsonData}
                        onChange={(e) => setJsonData(e.target.value)}
                        placeholder="Data will be displayed here..."
                        className="w-full h-full min-h-[300px] resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm p-4 leading-relaxed"
                      />
                    </div>
                  </CardContent>
                  <div className="p-4 border-t bg-muted/30">
                    <Button
                      className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-lg hover:shadow-xl transition-all"
                      size="lg"
                      onClick={handleDataSubmit}
                      disabled={isLoading}
                    >
                      <Save className="mr-2 h-5 w-5" />
                      {isLoading ? "Saving..." : "Save Dataset"}
                    </Button>
                    {!user && (
                      <p className="text-center text-xs text-muted-foreground mt-2 flex items-center justify-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Login Required
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Saved Datasets List */}
            {user && (
              <div className="mt-12 animate-fade-in-up">
                <h3 className="text-xl font-bold mb-6 flex items-center">
                  <Database className="mr-2 h-5 w-5 text-primary" />
                  My Datasets
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {datasets.map((dataset) => (
                    <Card key={dataset.id} className="group hover:shadow-md transition-shadow duration-300 border-muted">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-base font-semibold line-clamp-1" title={dataset.name}>
                              {dataset.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {new Date(dataset.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={dataset.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                            {dataset.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-4">
                          {dataset.description || "No description"}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {(dataset.file_size / 1024).toFixed(2)} KB
                          </Badge>
                          <div className="flex gap-2 opacity-10 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setJsonData(JSON.stringify(dataset.json_data, null, 2));
                              setDatasetName(dataset.name);
                              setDatasetDescription(dataset.description);
                              toast({ title: "Loaded", description: "Loaded into editor." });
                            }}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DataCollection;