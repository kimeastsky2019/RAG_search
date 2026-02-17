
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Brain, ArrowLeft, Plus, Edit, Trash2, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Policy {
  id: string;
  name: string;
  description: string;
  sparql_query: string;
  status: "active" | "draft" | "inactive";
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface LLMAnalysis {
  id: string;
  policy_id: string;
  analysis_result: string;
  quality_score: number;
  recommendations: any;
  analyzed_at: string;
}

const PolicyManagement = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [analyses, setAnalyses] = useState<LLMAnalysis[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    name: "",
    description: "",
    sparql_query: "",
    status: "draft" as const
  });
  const [currentAnalysis, setCurrentAnalysis] = useState<LLMAnalysis | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPolicies();
      fetchAnalyses();
    }
  }, [user]);

  const fetchPolicies = async () => {
    try {
      const data = await api.policies.list();
      setPolicies(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load policies",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchAnalyses = async () => {
    try {
      const data = await api.analysis.list();
      setAnalyses(data || []);
    } catch (error: any) {
      console.error('Failed to fetch analyses:', error);
    }
  };

  const handleCreatePolicy = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to create policies.",
        variant: "destructive",
      });
      return;
    }

    if (!newPolicy.name.trim() || !newPolicy.sparql_query.trim()) {
      toast({
        title: "Input Error",
        description: "Policy Name and SPARQL Query are required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await api.policies.create({
        name: newPolicy.name,
        description: newPolicy.description,
        sparql_query: newPolicy.sparql_query,
        status: newPolicy.status,
        created_by: user.id
      });

      toast({
        title: "Policy Created",
        description: "New policy created successfully.",
      });

      setNewPolicy({ name: "", description: "", sparql_query: "", status: "draft" });
      fetchPolicies();
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePolicy = async () => {
    if (!selectedPolicy || !user) return;

    setIsLoading(true);

    try {
      await api.policies.update(selectedPolicy.id, {
        name: selectedPolicy.name,
        description: selectedPolicy.description,
        sparql_query: selectedPolicy.sparql_query,
        status: selectedPolicy.status,
      });

      toast({
        title: "Policy Updated",
        description: "Policy updated successfully.",
      });

      setIsEditing(false);
      fetchPolicies();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePolicy = async (policyId: string, policyName: string) => {
    try {
      await api.policies.delete(policyId);

      toast({
        title: "Policy Deleted",
        description: `${policyName} has been deleted.`,
      });

      if (selectedPolicy?.id === policyId) {
        setSelectedPolicy(null);
      }
      fetchPolicies();
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLLMAnalysis = async () => {
    if (!selectedPolicy || !user) return;

    setIsAnalyzing(true);

    try {
      const data = await api.analysis.analyze({
        policy_id: selectedPolicy.id,
        sparql_query: selectedPolicy.sparql_query,
        policy_name: selectedPolicy.name,
      });

      toast({
        title: "Analysis Completed",
        description: "Policy quality analysis is complete.",
      });

      setCurrentAnalysis(data.analysis);
      fetchAnalyses();
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Error during LLM analysis.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusBadge = (status: Policy["status"]) => {
    const variants = {
      active: "bg-green-100 text-green-800 border-green-200",
      draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
      inactive: "bg-gray-100 text-gray-800 border-gray-200"
    };

    const labels = {
      active: "Active",
      draft: "Draft",
      inactive: "Inactive"
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please login to use Policy Management features.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button>Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <Settings className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Policy Management</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Policy Management System</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Establish SPARQL-based policies and manage quality via LLM.
            </p>
          </div>

          <Tabs defaultValue="policies" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="policies">Policy List</TabsTrigger>
              <TabsTrigger value="create">Create Policy</TabsTrigger>
              <TabsTrigger value="analysis">LLM Analysis</TabsTrigger>
            </TabsList>

            {/* Policy List Tab */}
            <TabsContent value="policies" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Policy List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Policy List</CardTitle>
                    <CardDescription>
                      Manage and edit registered policies.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {policies.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No policies created yet.
                      </p>
                    ) : (
                      policies.map((policy) => (
                        <div
                          key={policy.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedPolicy?.id === policy.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                            }`}
                          onClick={() => setSelectedPolicy(policy)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium">{policy.name}</h3>
                            {getStatusBadge(policy.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {policy.description || "No description"}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Updated: {new Date(policy.updated_at).toLocaleDateString()}</span>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPolicy(policy);
                                  setIsEditing(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePolicy(policy.id, policy.name);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Policy Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Policy Details</CardTitle>
                    <CardDescription>
                      Details and SPARQL query of the selected policy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedPolicy ? (
                      <div className="space-y-4">
                        {isEditing ? (
                          <>
                            <div>
                              <Label htmlFor="edit-name">Policy Name</Label>
                              <Input
                                id="edit-name"
                                value={selectedPolicy.name}
                                onChange={(e) => setSelectedPolicy({
                                  ...selectedPolicy,
                                  name: e.target.value
                                })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-description">Description</Label>
                              <Textarea
                                id="edit-description"
                                value={selectedPolicy.description || ""}
                                onChange={(e) => setSelectedPolicy({
                                  ...selectedPolicy,
                                  description: e.target.value
                                })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-query">SPARQL Query</Label>
                              <Textarea
                                id="edit-query"
                                value={selectedPolicy.sparql_query}
                                onChange={(e) => setSelectedPolicy({
                                  ...selectedPolicy,
                                  sparql_query: e.target.value
                                })}
                                className="min-h-[200px] font-mono text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-status">Status</Label>
                              <Select
                                value={selectedPolicy.status}
                                onValueChange={(value: Policy["status"]) =>
                                  setSelectedPolicy({
                                    ...selectedPolicy,
                                    status: value
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex space-x-2">
                              <Button onClick={handleUpdatePolicy} disabled={isLoading}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {isLoading ? "Saving..." : "Save"}
                              </Button>
                              <Button variant="outline" onClick={() => setIsEditing(false)}>
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <h3 className="font-medium mb-2">{selectedPolicy.name}</h3>
                              <p className="text-sm text-muted-foreground mb-4">
                                {selectedPolicy.description || "No description"}
                              </p>
                            </div>
                            <div>
                              <Label>SPARQL Query</Label>
                              <Textarea
                                value={selectedPolicy.sparql_query}
                                readOnly
                                className="min-h-[200px] font-mono text-sm bg-muted/50"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">Status:</span>
                                {getStatusBadge(selectedPolicy.status)}
                              </div>
                              <Button onClick={() => setIsEditing(true)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Select a policy to view details.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Create Policy Tab */}
            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="h-5 w-5 mr-2 text-primary" />
                    Create New Policy
                  </CardTitle>
                  <CardDescription>
                    Create a new policy based on SPARQL query.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-name">Policy Name *</Label>
                      <Input
                        id="new-name"
                        value={newPolicy.name}
                        onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                        placeholder="Enter policy name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-status">Status</Label>
                      <Select
                        value={newPolicy.status}
                        onValueChange={(value: "draft" | "active" | "inactive") =>
                          setNewPolicy({ ...newPolicy, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new-description">Description</Label>
                    <Textarea
                      id="new-description"
                      value={newPolicy.description}
                      onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                      placeholder="Enter description for the policy"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-query">SPARQL Query *</Label>
                    <Textarea
                      id="new-query"
                      value={newPolicy.sparql_query}
                      onChange={(e) => setNewPolicy({ ...newPolicy, sparql_query: e.target.value })}
                      placeholder="PREFIX ex: <http://example.org/ontology#>&#10;SELECT ?s ?p ?o WHERE { ?s ?p ?o }"
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>

                  <Button onClick={handleCreatePolicy} className="w-full" disabled={isLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isLoading ? "Creating..." : "Create Policy"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* LLM Analysis Tab */}
            <TabsContent value="analysis" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-primary" />
                      LLM Quality Analysis
                    </CardTitle>
                    <CardDescription>
                      Analyze the quality of the selected policy's SPARQL query.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedPolicy ? (
                      <>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <h4 className="font-medium mb-2">Target Policy</h4>
                          <p className="text-sm">{selectedPolicy.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedPolicy.description || "No description"}
                          </p>
                        </div>

                        <Button
                          onClick={handleLLMAnalysis}
                          disabled={isAnalyzing}
                          className="w-full"
                        >
                          {isAnalyzing ? (
                            <>
                              <Brain className="h-4 w-4 mr-2 animate-pulse" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Brain className="h-4 w-4 mr-2" />
                              Start LLM Quality Analysis
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Please select a policy to analyze first.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Results</CardTitle>
                    <CardDescription>
                      Quality analysis and improvement suggestions provided by LLM.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentAnalysis ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Quality Score</span>
                          <Badge variant="outline">
                            {currentAnalysis.quality_score}/100
                          </Badge>
                        </div>
                        <div className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">
                          {currentAnalysis.analysis_result}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Results will appear here after LLM analysis.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PolicyManagement;