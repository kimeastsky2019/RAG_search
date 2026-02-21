import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, FileText, Zap, Brain, ArrowRight, Upload, Search, Settings, ShieldCheck, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import AuthDialog from "@/components/AuthDialog";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20">

      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] mix-blend-screen animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Header */}
      <header className="border-b bg-background/50 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/50 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src="/ontology/logo.png" alt="GnG Logo" className="h-10 w-auto relative z-10" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent transform group-hover:scale-[1.02] transition-transform">
                GnG Ontology
              </h1>
            </div>
            <nav className="flex items-center space-x-8">
              <div className="hidden md:flex items-center space-x-1 bg-muted/50 p-1 rounded-full border border-white/10 backdrop-blur-md">
                {[
                  { to: "/data-collection", label: "Collect" },
                  { to: "/ttl-converter", label: "Convert" },
                  { to: "/sparql-query", label: "Query" },
                  { to: "/policy-management", label: "Policy" },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-full transition-all duration-300"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <AuthDialog />
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            Next Gen Ontology System
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Transform Data into <br />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-purple-500 bg-clip-text text-transparent">
              Intelligent Knowledge
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Seamlessly collect, convert, and query ontology data with our
            AI-powered cloud platform. Built for scale, secured by policy.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/data-collection">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-primary to-blue-600 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 group">
                <Upload className="mr-2 h-5 w-5 group-hover:-translate-y-1 transition-transform" />
                Start Data Ingestion
              </Button>
            </Link>
            <Link to="/sparql-query">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300">
                <Search className="mr-2 h-5 w-5" />
                Explore Knowledge Graph
              </Button>
            </Link>
          </div>
        </div>

        {/* Abstract Grid Decoration */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      </section>

      {/* Workflow Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connecting Line (Desktop) */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 hidden md:block z-0" />

            {[
              {
                icon: Upload,
                title: "1. Ingest",
                desc: "Upload JSON/CSV or connect APIs",
                color: "text-blue-500",
                bg: "bg-blue-500/10",
                delay: "0s"
              },
              {
                icon: FileText,
                title: "2. Transform",
                desc: "Auto-convert to RDF/TTL format",
                color: "text-green-500",
                bg: "bg-green-500/10",
                delay: "0.1s"
              },
              {
                icon: Database,
                title: "3. Store",
                desc: "Load into Fuseki Triple Store",
                color: "text-orange-500",
                bg: "bg-orange-500/10",
                delay: "0.2s"
              },
              {
                icon: ShieldCheck,
                title: "4. Verify",
                desc: "Policy checks & LLM Analysis",
                color: "text-purple-500",
                bg: "bg-purple-500/10",
                delay: "0.3s"
              },
            ].map((step, i) => (
              <Card key={i} className="relative z-10 border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 group animate-fade-in-up" style={{ animationDelay: step.delay }}>
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto w-16 h-16 ${step.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                    <step.icon className={`h-8 w-8 ${step.color}`} />
                  </div>
                  <CardTitle className="text-xl font-bold">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center font-medium">
                    {step.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-muted/30 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />

        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Core Capabilities</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build, manage, and scale your ontology infrastructure.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Database}
              title="Triple Store Integration"
              desc="Seamlessly connect with Apache Jena Fuseki via 3030 port. Manage SPARQL endpoints with ease."
            />
            <FeatureCard
              icon={Zap}
              title="Instant TTL Conversion"
              desc="Powerful Python-based engine to transform massive JSON datasets into valid Turtle (TTL) syntax."
            />
            <FeatureCard
              icon={Brain}
              title="LLM Quality Gate"
              desc="Integrate with Ollama (Llama3, Qwen) to automatically audit data quality and policy compliance."
            />
            <FeatureCard
              icon={Activity}
              title="Real-time Monitoring"
              desc="Track query performance, execution times, and system health status in real-time."
            />
            <FeatureCard
              icon={Settings}
              title="Dynamic Policy Engine"
              desc="Define and enforce data access and validity rules using standard SPARQL queries."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Enterprise Security"
              desc="Row Level Security (RLS) ensures data isolation and protection for every user."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/80 py-12 px-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-muted-foreground">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <img src="/ontology/logo.png" alt="GnG" className="h-6 w-auto" />
            <span className="font-semibold text-foreground">GnG Ontology</span>
          </div>
          <p className="text-sm">
            &copy; 2024 Ontology Data System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <div className="p-6 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group">
    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
      <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
    </div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">
      {desc}
    </p>
  </div>
);

export default Index;
