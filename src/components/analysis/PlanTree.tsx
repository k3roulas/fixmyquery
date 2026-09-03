'use client';

import { useState } from 'react';
import type { Finding, PlanNode } from '@/lib/types';

import PlanNodeCard from './PlanNodeCard';

interface Props {
  root: PlanNode;
  findings: Finding[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function PlanTree({ root, findings, selectedId, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const flaggedIds = new Set(findings.map((f) => f.nodeId));

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function renderNode(node: PlanNode, depth: number): React.ReactNode[] {
    const isCollapsed = collapsed.has(node.id);
    const rows: React.ReactNode[] = [
      <div key={node.id} className="flex items-start gap-1" style={{ marginLeft: depth * 16 }}>
        {node.children.length > 0 ? (
          <button
            type="button"
            aria-label={isCollapsed ? 'Expand node' : 'Collapse node'}
            onClick={() => toggle(node.id)}
            className="mt-1.5 w-4 shrink-0 text-center font-mono text-xs text-zinc-500 hover:text-zinc-200"
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <div className="min-w-0 flex-1 pb-1.5">
          <PlanNodeCard
            node={node}
            selected={selectedId === node.id}
            flagged={flaggedIds.has(node.id)}
            onSelect={onSelect}
          />
        </div>
      </div>,
    ];
    if (!isCollapsed) {
      for (const child of node.children) {
        rows.push(renderNode(child, depth + 1));
      }
    }
    return rows;
  }

  return <div className="space-y-0">{renderNode(root, 0)}</div>;
}
