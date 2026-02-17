
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Play, ArrowLeft, Database, Code, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface QueryExecution {
  id: string;
  query: string;
  results: any;
  execution_time: number;
  status: string;
  executed_at: string;
}

const SPARQLQuery = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [queryHistory, setQueryHistory] = useState<QueryExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [fusekiEndpoint] = useState("http://localhost:3030/fc/sparql");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchQueryHistory();
    }
  }, [user]);

  const fetchQueryHistory = async () => {
    try {
      const data = await api.sparql.history();
      setQueryHistory(data || []);
    } catch (error: any) {
      console.error('Failed to fetch query history:', error);
    }
  };

  const sampleQueries = {
    basic: `PREFIX ex: <http://example.org/ontology#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object
}
LIMIT 10`,

    district: `PREFIX ex: <http://example.org/ontology#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?district ?population ?area
WHERE {
  ?district rdf:type ex:District ;
           ex:population ?population ;
           ex:area ?area .
}`,

    landmarks: `PREFIX ex: <http://example.org/ontology#>

SELECT ?landmark ?type ?location
WHERE {
  ?district ex:landmarks ?landmarkNode .
  ?landmarkNode ex:name ?landmark ;
               ex:type ?type ;
               ex:location ?location .
}`,

    transportation: `PREFIX ex: <http://example.org/ontology#>

SELECT ?district ?subwayLines ?busRoutes
WHERE {
  ?district ex:transportation ?transport .
  ?transport ex:subway_lines ?subwayLines ;
            ex:bus_routes ?busRoutes .
}`
  };

  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "No Query",
        description: "Please enter a SPARQL query to execute.",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);

    try {
      const data = await api.sparql.execute({
        query,
        fuseki_endpoint: fusekiEndpoint,
        executed_by: user?.id
      });

      setResults(data.results);
      setExecutionTime(data.execution_time);

      toast({
        title: "Query Executed Successfully",
        description: `Execution Time: ${data.execution_time}ms`,
      });

      // Refresh query history
      if (user) {
        fetchQueryHistory();
      }

    } catch (error: any) {
      toast({
        title: "Query Execution Failed",
        description: error.message || "An error occurred during SPARQL query execution.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const loadSampleQuery = (queryType: keyof typeof sampleQueries) => {
    setQuery(sampleQueries[queryType]);
  };

  const formatResults = (results: any) => {
    if (!results) return null;

    if (results.head && results.results && results.results.bindings) {
      const vars = results.head.vars;
      const bindings = results.results.bindings;

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {bindings.length} results
            </span>
            {executionTime && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {executionTime}ms
              </Badge>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {vars.map((variable: string) => (
                    <TableHead key={variable}>{variable}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bindings.map((binding: any, index: number) => (
                  <TableRow key={index}>
                    {vars.map((variable: string) => (
                      <TableCell key={variable} className="font-mono text-sm">
                        {binding[variable] ? binding[variable].value : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-muted/50 rounded-lg">
        <pre className="text-sm whitespace-pre-wrap">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
    );
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
              <Search className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">SPARQL Query</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">SPARQL Query Executor</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Execute SPARQL queries on Apache Jena Fuseki server to query ontology data.
            </p>
          </div>

          {/* Fuseki Connection Info */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-primary" />
                Fuseki Server Connection Info
              </CardTitle>
              <CardDescription>
                Apache Jena Fuseki server endpoint and connection status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Endpoint: {fusekiEndpoint}</p>
                  <p className="text-sm text-muted-foreground">Port: 3030 | Dataset: fc</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Server Start Command:</strong> ./fuseki-server --mem /fc</p>
                <p><strong>Web Interface:</strong> http://localhost:3030</p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="query" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="query">Execute Query</TabsTrigger>
              <TabsTrigger value="samples">Sample Queries</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Query Execution Tab */}
            <TabsContent value="query" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Query Input Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Code className="h-5 w-5 mr-2 text-primary" />
                      SPARQL Query Input
                    </CardTitle>
                    <CardDescription>
                      Enter the SPARQL query to execute.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="PREFIX ex: <http://example.org/ontology#>&#10;SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />

                    <Button
                      onClick={handleExecuteQuery}
                      disabled={isExecuting || !query.trim()}
                      className="w-full bg-gradient-to-r from-primary to-primary-glow"
                    >
                      {isExecuting ? (
                        <>
                          <Play className="h-4 w-4 mr-2 animate-pulse" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Execute Query
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Results Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-primary" />
                      Query Results
                    </CardTitle>
                    <CardDescription>
                      SPARQL query execution results.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {results ? (
                      formatResults(results)
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Results will appear here after execution.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Sample Queries Tab */}
            <TabsContent value="samples" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sample Queries</CardTitle>
                  <CardDescription>
                    Frequently used SPARQL query examples.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-medium">Basic Queries</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => loadSampleQuery('basic')}
                      >
                        Select All Data
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => loadSampleQuery('district')}
                      >
                        Select District Info
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Advanced Queries</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => loadSampleQuery('landmarks')}
                      >
                        Select Landmarks
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => loadSampleQuery('transportation')}
                      >
                        Select Transportation
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Query Writing Tips</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Define PREFIX declarations first</li>
                      <li>• Use LIMIT for large datasets</li>
                      <li>• Utilize FILTER for conditional search</li>
                      <li>• Use OPTIONAL for missing data</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Query History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    Execution History
                  </CardTitle>
                  <CardDescription>
                    History of recently executed SPARQL queries.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!user ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Please login to view query history.</p>
                    </div>
                  ) : queryHistory.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>No queries executed yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {queryHistory.map((execution) => (
                        <div
                          key={execution.id}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setQuery(execution.query)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {execution.status === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="text-sm font-medium">
                                {execution.status === 'success' ? 'Success' : 'Failed'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>{execution.execution_time}ms</span>
                              <span>{new Date(execution.executed_at).toLocaleString()}</span>
                            </div>
                          </div>
                          <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                            {execution.query.length > 200
                              ? execution.query.substring(0, 200) + '...'
                              : execution.query
                            }
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Next Steps */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">
              Create policies based on query results.
            </p>
            <Link to="/policy-management">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow">
                Go to Policy Management
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SPARQLQuery;