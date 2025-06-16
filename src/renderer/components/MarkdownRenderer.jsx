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
                showLineNumbers={true}
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
                // Fix DOM nesting warnings by handling paragraphs that contain code blocks
                p: ({ node, children, ...props }) => {
                    // Check if this paragraph contains only a code block
                    const hasCodeBlock = node.children.some(child => 
                        child.type === 'element' && child.tagName === 'code' && child.properties?.className
                    );
                    
                    if (hasCodeBlock) {
                        // Return a div instead of p to avoid nesting issues
                        return <div className="mb-2" {...props}>{children}</div>;
                    }
                    
                    return <p className="mb-2" {...props}>{children}</p>;
                },
                // Custom link styling
                a: ({ node, ...props }) => (
                    <a className="text-blue-400 hover:underline" {...props} />
                ),
                // Custom image styling
                img: ({ node, ...props }) => (
                    <img className="max-w-full h-auto rounded-md my-2" {...props} />
                ),
                // Handle lists properly
                ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside mb-2 space-y-1" {...props} />
                ),
                ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />
                ),
                // Handle headings
                h1: ({ node, ...props }) => (
                    <h1 className="text-xl font-bold mb-2 mt-4" {...props} />
                ),
                h2: ({ node, ...props }) => (
                    <h2 className="text-lg font-bold mb-2 mt-3" {...props} />
                ),
                h3: ({ node, ...props }) => (
                    <h3 className="text-base font-bold mb-2 mt-2" {...props} />
                ),
                // Handle blockquotes
                blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-gray-500 pl-4 italic text-gray-300 my-2" {...props} />
                ),
            }}
            // Remove prose classes to avoid conflicts with custom components
            className="text-gray-200"
        >
            {content || ''}
        </ReactMarkdown>
    );
};

export default MarkdownRenderer;