"use client";

export interface FootnoteProps {
  text: string;
  className?: string;
}

export function Footnote({ text, className = "" }: FootnoteProps) {
  return (
    <p
      className={`text-caption text-ink-tertiary ${className}`}
      role="note"
    >
      {text}
    </p>
  );
}
