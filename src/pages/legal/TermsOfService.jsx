import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '../../components/common/Header';
import content from '../../../docs/legal/TERMS_OF_SERVICE.md?raw';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 text-sm mb-4 inline-block"
        >
          &larr; 戻る
        </button>

        <div className="bg-white rounded-xl shadow-sm p-5 prose prose-sm max-w-none
          prose-headings:text-gray-800
          prose-h1:text-xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-3 prose-h1:mb-5
          prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
          prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
          prose-p:text-gray-600 prose-p:text-sm prose-p:leading-relaxed
          prose-li:text-gray-600 prose-li:text-sm
          prose-strong:text-gray-800
          prose-table:text-xs
          prose-th:bg-gray-50 prose-th:px-3 prose-th:py-1.5 prose-th:text-left prose-th:font-medium prose-th:text-gray-600
          prose-td:px-3 prose-td:py-1.5 prose-td:border-t prose-td:border-gray-100
          prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r-lg prose-blockquote:text-blue-800 prose-blockquote:not-italic prose-blockquote:text-sm
          prose-pre:bg-gray-50 prose-pre:text-gray-700 prose-pre:border prose-pre:border-gray-200
          prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:text-gray-700
          prose-hr:border-gray-200 prose-hr:my-6
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </main>
    </div>
  );
}
