import { formatDateTime } from '../../utils/dateUtils';

export default function SignatureDisplay({ imageUrl, signedAt, signerName, onRedo }) {
  if (!imageUrl) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 border-2 border-dashed border-gray-300">
        <p className="text-center text-gray-500 text-sm">元請確認欄: 未署名</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">元請確認欄</h3>
        {onRedo && (
          <button
            onClick={onRedo}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            サインをやり直す
          </button>
        )}
      </div>
      <div className="bg-gray-50 rounded-lg p-2">
        <img
          src={imageUrl}
          alt="元請サイン"
          className="max-h-24 mx-auto"
        />
      </div>
      <div className="mt-2 text-xs text-gray-500 space-y-1">
        {signedAt && (
          <p>署名日時: {formatDateTime(signedAt)}</p>
        )}
        {signerName && (
          <p>署名者: {signerName}</p>
        )}
      </div>
    </div>
  );
}
