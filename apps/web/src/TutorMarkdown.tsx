import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function TutorMarkdown({ children }: { children: string }) {
  return (
    <div className="tutor-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ alt }) => <span>{alt}</span>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
