/**
 * MessageMarkdown - renders assistant chat text as formatted markdown.
 *
 * The AI replies arrive as markdown (headings, bold, bullet lists, GFM tables).
 * Rendering them as a single raw string produced "big blocks of text"; this
 * component maps each markdown element to a compact, scannable style that
 * mirrors the clean report layout (spaced paragraphs, section headings, tidy
 * bullet lists, and tables with right-aligned numeric columns).
 *
 * Emphasis is intentional, not automatic: the model decides what to bold (the
 * key takeaway per paragraph, totals, final rows), following the formatting
 * rules in the nl-parse prompts. This renderer only styles the markdown it is
 * given — it does not force every figure into bold.
 */

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageMarkdownProps {
  content: string
}

export const MessageMarkdown: React.FC<MessageMarkdownProps> = ({ content }) => {
  return (
    <div className="text-[11px] text-[#414651] leading-[1.55] space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraphs: comfortable line-height, spacing handled by wrapper's space-y.
          p: ({ children }) => <p className="leading-[1.55]">{children}</p>,

          // Section headings - bold, darker, a touch larger, extra top spacing.
          h1: ({ children }) => (
            <h3 className="text-[13px] font-semibold text-[#181D27] mt-3 first:mt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="text-[13px] font-semibold text-[#181D27] mt-3 first:mt-0">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-[12px] font-semibold text-[#181D27] mt-2.5 first:mt-0">{children}</h4>
          ),

          strong: ({ children }) => <strong className="font-semibold text-[#181D27]">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,

          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 marker:text-[#A4A7AE]">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 marker:text-[#A4A7AE]">{children}</ol>,
          li: ({ children }) => <li className="leading-[1.5] pl-0.5">{children}</li>,

          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] underline underline-offset-2 hover:text-[#6D28D9]">
              {children}
            </a>
          ),

          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-[#F5F5F5] text-[#181D27] text-[10px] font-mono">{children}</code>
          ),

          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#E9EAEB] pl-3 text-[#717680] italic">{children}</blockquote>
          ),

          hr: () => <hr className="border-t border-[#F0F0F0] my-1" />,

          // Tables - clean report style: bold header underline, subtle row dividers.
          // These replies are label-then-numbers tables (Year/Item first, figures
          // after), so the first column left-aligns and the rest right-align to sit
          // over their numbers. Horizontal scroll if it overflows the pane.
          table: ({ children }) => (
            <div className="overflow-x-auto -mx-1 my-1">
              <table className="w-full border-collapse text-[11px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-[#F0F0F0] last:border-0">{children}</tr>,
          th: ({ children }) => (
            <th className="py-1.5 px-2 font-semibold text-[#181D27] border-b border-[#E9EAEB] text-right first:text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-1.5 px-2 align-top text-right tabular-nums whitespace-nowrap first:text-left first:whitespace-normal">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
