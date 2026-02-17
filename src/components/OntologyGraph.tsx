
import { useCallback, useMemo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Network } from 'lucide-react';

const initialNodes: Node[] = [
    {
        id: 'center',
        type: 'input',
        data: { label: 'Metadata Ontology' },
        position: { x: 250, y: 0 },
        style: { background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' },
    },
    {
        id: 'doc-type',
        data: { label: 'Document Type' },
        position: { x: 100, y: 100 },
        style: { background: '#ec4899', color: 'white', border: 'none', borderRadius: '20px' },
    },
    {
        id: 'category',
        data: { label: 'Category' },
        position: { x: 400, y: 100 },
        style: { background: '#10b981', color: 'white', border: 'none', borderRadius: '20px' },
    },
    {
        id: 'pdf',
        data: { label: 'PDF' },
        position: { x: 50, y: 200 },
    },
    {
        id: 'txt',
        data: { label: 'TXT' },
        position: { x: 150, y: 200 },
    },
    {
        id: 'finance',
        data: { label: 'Finance' },
        position: { x: 350, y: 200 },
    },
    {
        id: 'legal',
        data: { label: 'Legal' },
        position: { x: 450, y: 200 },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: 'center', target: 'doc-type', animated: true, style: { stroke: '#6366f1' } },
    { id: 'e1-3', source: 'center', target: 'category', animated: true, style: { stroke: '#6366f1' } },
    { id: 'e2-4', source: 'doc-type', target: 'pdf', animated: true, style: { stroke: '#ec4899' } },
    { id: 'e2-5', source: 'doc-type', target: 'txt', animated: true, style: { stroke: '#ec4899' } },
    { id: 'e3-6', source: 'category', target: 'finance', animated: true, style: { stroke: '#10b981' } },
    { id: 'e3-7', source: 'category', target: 'legal', animated: true, style: { stroke: '#10b981' } },
];

export function OntologyGraph() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    return (
        <Card className="w-full mt-8 ai-glow border-primary/20 overflow-hidden">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-primary" />
                    Ontology Visualization
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[500px] p-0 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    attributionPosition="bottom-right"
                >
                    <Background color="#aaa" gap={16} />
                    <Controls />
                    <MiniMap
                        nodeStrokeColor={(n) => {
                            if (n.style?.background) return n.style.background as string;
                            if (n.type === 'input') return '#0041d0';
                            if (n.type === 'output') return '#ff0072';
                            if (n.type === 'default') return '#1a192b';
                            return '#eee';
                        }}
                        nodeColor={(n) => {
                            if (n.style?.background) return n.style.background as string;
                            return '#fff';
                        }}
                    />
                </ReactFlow>
                <div className="absolute top-4 right-4 bg-background/80 backdrop-blur p-4 rounded-lg border shadow-sm max-w-xs text-sm pointer-events-none">
                    <p className="font-semibold mb-1">Interactive Graph</p>
                    <p className="text-muted-foreground">
                        This chart visualizes the relationships between document metadata, categories, and file types in your ontology.
                        Upload documents to populate this graph dynamically in future updates.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
