
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, ArrowLeft, Zap, Code, Cloud, Save, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Dataset {
  id: string;
  name: string;
  json_data: any;
}

const TTLConverter = () => {
  const [inputData, setInputData] = useState("");
  const [outputTTL, setOutputTTL] = useState("");
  const [baseURI, setBaseURI] = useState("http://example.org/ontology#");
  const [namespace, setNamespace] = useState("ex");
  const [isConverting, setIsConverting] = useState(false);

  // Database State
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

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
      console.error('Failed to fetch datasets:', error);
    }
  };

  const handleDatasetSelect = (value: string) => {
    setSelectedDatasetId(value);
    const dataset = datasets.find(d => d.id === value);
    if (dataset) {
      setInputData(JSON.stringify(dataset.json_data, null, 2));
      toast({
        title: "Dataset Loaded",
        description: `${dataset.name} data loaded into input.`,
      });
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleSaveToCloud = async () => {
    if (!user) return;
    if (!outputTTL) return;

    setIsSaving(true);
    try {
      await api.ttl.save({
        dataset_id: selectedDatasetId || null,
        ttl_content: outputTTL,
        created_by: user.id
      });

      toast({
        title: "Save Completed",
        description: "TTL file saved to local database.",
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadToFuseki = async () => {
    if (!outputTTL) return;
    setIsUploading(true);
    try {
      const res = await api.fuseki.upload({
        ttl_content: outputTTL,
        dataset: 'fc' // default
      });
      toast({
        title: "Loaded to Fuseki",
        description: res.message || "Data is now queryable via SPARQL.",
        className: "bg-green-100 border-green-200 text-green-800"
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConvert = async () => {
    if (!inputData.trim()) {
      toast({
        title: "No Input Data",
        description: "Please enter JSON data to convert.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);

    try {
      // Simulate conversion process
      await new Promise(resolve => setTimeout(resolve, 1000));

      const jsonData = JSON.parse(inputData);
      const ttlOutput = generateTTL(jsonData, baseURI, namespace);
      setOutputTTL(ttlOutput);

      toast({
        title: "Conversion Completed",
        description: "JSON data successfully converted to TTL format.",
      });
    } catch (error) {
      toast({
        title: "Conversion Failed",
        description: "Please check if it's valid JSON.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const generateTTL = (data: any, baseURI: string, namespace: string) => {
    let ttl = `@prefix ${namespace}: <${baseURI}> .\n`;
    ttl += `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n`;
    ttl += `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n`;
    ttl += `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n`;

    const convertObject = (obj: any, subject: string, indent: string = "") => {
      let result = "";

      for (const [key, value] of Object.entries(obj)) {
        const predicate = `${namespace}:${key}`;

        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === "object") {
              const itemSubject = `${subject}_${key}_${index}`;
              result += `${indent}${predicate} ${namespace}:${itemSubject} ;\n`;
              result += convertObject(item, itemSubject, indent + "  ");
            } else {
              result += `${indent}${predicate} "${item}" ;\n`;
            }
          });
        } else if (typeof value === "object" && value !== null) {
          const objectSubject = `${subject}_${key}`;
          result += `${indent}${predicate} ${namespace}:${objectSubject} ;\n`;
          result += convertObject(value, objectSubject, indent + "  ");
        } else if (typeof value === "number") {
          result += `${indent}${predicate} ${value} ;\n`;
        } else {
          result += `${indent}${predicate} "${value}" ;\n`;
        }
      }

      return result;
    };

    if (data.district) {
      const subject = `${namespace}:${data.district.replace(/\s+/g, "_")}`;
      ttl += `${subject} rdf:type ${namespace}:District ;\n`;
      ttl += convertObject(data, data.district.replace(/\s+/g, "_"));
      ttl += ".\n";
    } else {
      const mainSubject = `${namespace}:Data_${Date.now()}`;
      ttl += `${mainSubject} rdf:type ${namespace}:Dataset ;\n`;
      ttl += convertObject(data, mainSubject);
      ttl += ".\n";
    }

    return ttl;
  };

  const handleDownload = () => {
    if (!outputTTL) {
      toast({
        title: "Download Unavailable",
        description: "Please complete TTL conversion first.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([outputTTL], { type: "text/turtle" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ontology.ttl";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Completed",
      description: "TTL file downloaded successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Home
            </Link>
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">TTL Converter</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">JSON to TTL Converter</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Convert JSON data to RDF/TTL format to construct ontology.
            </p>
          </div>

          {/* Configuration Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Conversion Settings</CardTitle>
              <CardDescription>
                Set namespace and base URI for TTL conversion.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="base-uri">Base URI</Label>
                <Input
                  id="base-uri"
                  value={baseURI}
                  onChange={(e) => setBaseURI(e.target.value)}
                  placeholder="http://example.org/ontology#"
                />
              </div>
              <div>
                <Label htmlFor="namespace">Namespace</Label>
                <Input
                  id="namespace"
                  value={namespace}
                  onChange={(e) => setNamespace(e.target.value)}
                  placeholder="ex"
                />
              </div>
              <div>
                <Label htmlFor="conversion-type">Select Dataset</Label>
                <Select value={selectedDatasetId} onValueChange={handleDatasetSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Load Saved Dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="h-5 w-5 mr-2 text-primary" />
                  Input Data (JSON)
                </CardTitle>
                <CardDescription>
                  Enter JSON data to convert or select a dataset.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder='{"district": "Gangnam-gu", "population": 561052, ...}'
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />

                <Button
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="w-full bg-gradient-to-r from-primary to-primary-glow"
                >
                  {isConverting ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Convert to TTL
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Output Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    Output Data (TTL)
                  </div>
                  {user && outputTTL && (
                    <Button variant="outline" size="sm" onClick={handleSaveToCloud} disabled={isSaving}>
                      <Cloud className="h-3 w-3 mr-2" />
                      {isSaving ? "Saving" : "Save to DB"}
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  Converted RDF/TTL format data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={outputTTL}
                  readOnly
                  placeholder="Converted TTL data will appear here..."
                  className="min-h-[400px] font-mono text-sm bg-muted/50"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={handleDownload}
                    disabled={!outputTTL}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  {user && outputTTL && (
                    <Button
                      onClick={handleUploadToFuseki}
                      disabled={isUploading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      {isUploading ? "Uploading..." : "Load to Fuseki"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Python Command Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Python Conversion Command</CardTitle>
              <CardDescription>
                How to convert TTL using Python locally
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Virtual Env Setup & Conversion:</h4>
                <pre className="text-sm overflow-x-auto">
                  {`# Create & Activate Virtual Environment
python3 -m venv .venv
source .venv/bin/activate

# Install Required Packages
pip install rdflib>=7.0.0

# Execute JSON to TTL Conversion
python seoul_json_to_ttl.py --input gangnam.json --output gangnam.ttl`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">
              Once TTL conversion is done, try executing SPARQL queries.
            </p>
            <Link to="/sparql-query">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow">
                Execute SPARQL Query
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TTLConverter;