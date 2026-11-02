'use client';
import { useState } from 'react';
import { REFERENCES } from '@/lib/references';
import CitationModal from './CitationModal';
export default function CitationBadge({ id = 'scope-boundaries', label = '[2] GHG Protocol' }: { id?: string; label?: string }) {
  const [open, setOpen] = useState(false); const reference = REFERENCES.find(row => row.id === id) ?? REFERENCES[0];
  return <><button className="source-badge" onClick={() => setOpen(true)} aria-label={`查看文献 ${label}`}>{label} ↗</button><CitationModal reference={open ? reference : null} onClose={() => setOpen(false)} /></>;
}
