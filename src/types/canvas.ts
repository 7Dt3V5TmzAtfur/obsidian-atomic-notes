export interface CanvasNode {
    id: string;
    type: 'file' | 'text' | 'group' | 'link';
    x: number;
    y: number;
    width: number;
    height: number;
    file?: string;
    text?: string;
    label?: string;
    color?: string;
}

export interface CanvasEdge {
    id: string;
    fromNode: string;
    fromSide?: 'top' | 'right' | 'bottom' | 'left';
    toNode: string;
    toSide?: 'top' | 'right' | 'bottom' | 'left';
    label?: string;
    color?: string;
}

export interface CanvasData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
}
