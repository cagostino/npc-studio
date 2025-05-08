import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    const handleCopy = () => {
        navigator.clipboard.writeText(codeString).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => console.error('Failed to copy code:', err));
    };

    if (inline) {
        return (
            <code className={`${className} bg-gray-700 text-pink-400 px-1 py-0.5 rounded-sm font-mono text-xs`} {...props}>
                {children}
            </code>
        );
    }

    return (
        <div className="relative group my-2 bg-gray-950 rounded-md overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between px-4 py-1 bg-gray-800 text-xs text-gray-400">
                <span>{match && match[1] ? match[1] : 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                    aria-label="Copy code"
                >
                    {copied ? (
                        <Check size={14} className="text-green-500" />
                    ) : (
                        <Copy size={14} />
                    )}
                </button>
            </div>
            <SyntaxHighlighter
                style={atomDark}
                language={match ? match[1] : null}
                PreTag="div"
                className="!bg-gray-950 !p-4 text-sm"
                {...props}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
    );
};

const MarkdownRenderer = ({ content }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code: CodeBlock,
                // Tailwind CSS Typography plugin handles most styling.
                // You can override or add more custom components if needed:
                // p: ({node, ...props}) => <p className="mb-2" {...props} />,
                // a: ({node, ...props}) => <a className="text-blue-400 hover:underline" {...props} />,
                // img: ({node, ...props}) => <img className="max-w-full h-auto rounded-md my-2" {...props} />,
            }}
            // Apply prose for overall Markdown styling. Adjust prose-sm, prose-base, etc. as needed.
            // prose-invert is for dark mode.
            className="prose prose-sm prose-invert max-w-none"
        >
            {content || ''}
        </ReactMarkdown>
    );
};

export default MarkdownRenderer;