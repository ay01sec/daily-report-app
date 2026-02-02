const statusConfig = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-600' },
  signed: { label: 'サイン済み', color: 'bg-yellow-100 text-yellow-700' },
  submitted: { label: '送信完了', color: 'bg-blue-100 text-blue-700' },
  approved: { label: '承認済み', color: 'bg-green-100 text-green-700' },
  rejected: { label: '差戻し', color: 'bg-red-100 text-red-700' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
