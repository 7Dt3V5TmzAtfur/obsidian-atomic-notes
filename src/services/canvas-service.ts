import { TFile } from 'obsidian';
import { CanvasData, CanvasNode, CanvasEdge } from '../types/canvas';

export class CanvasService {
    /**
     * 生成星形辐射布局的 Canvas 数据
     * @param originalNote 原笔记文件
     * @param cardPaths 原子卡片的文件路径列表
     */
    generateCanvas(originalNote: TFile, cardPaths: string[]): CanvasData {
        const nodes: CanvasNode[] = [];
        const edges: CanvasEdge[] = [];

        // 1. 中心节点：原笔记
        const centerId = 'center-node';
        const centerWidth = 600;
        const centerHeight = 400;

        // 按照需求：位置 (x: 0, y: 0)
        nodes.push({
            id: centerId,
            type: 'file',
            file: originalNote.path,
            x: 0,
            y: 0,
            width: centerWidth,
            height: centerHeight
        });

        if (cardPaths.length === 0) {
            return { nodes, edges };
        }

        // 2. 子节点布局
        const radius = 800;
        const cardWidth = 400;
        const cardHeight = 400;

        // 计算中心点的几何中心，用于辐射计算
        const originX = 0 + centerWidth / 2;
        const originY = 0 + centerHeight / 2;

        cardPaths.forEach((path, index) => {
            const angle = (2 * Math.PI * index) / cardPaths.length;
            const nodeId = `node-${index}`;

            // 计算卡片中心位置
            const centerX = originX + radius * Math.cos(angle);
            const centerY = originY + radius * Math.sin(angle);

            // 转换为卡片左上角坐标
            const x = Math.round(centerX - cardWidth / 2);
            const y = Math.round(centerY - cardHeight / 2);

            nodes.push({
                id: nodeId,
                type: 'file',
                file: path,
                x: x,
                y: y,
                width: cardWidth,
                height: cardHeight
            });

            // 3. 连线：从中心指向子节点
            edges.push({
                id: `edge-${index}`,
                fromNode: centerId,
                toNode: nodeId
            });
        });

        return { nodes, edges };
    }
}
