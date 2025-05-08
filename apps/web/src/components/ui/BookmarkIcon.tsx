/**
 * A dumb component that renders a ribbon style bookmark icon that can be set to either filled or not filled.
 * It does NOT remember its own state so the parent component must handle that.
 */
export default function BookmarkIcon({ isBookmarked }: { isBookmarked: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={isBookmarked ? 'currentColor' : 'none'}
      strokeWidth={2}
      stroke="currentColor"
      className={`w-6 h-6 ${isBookmarked ? 'text-asq-primary' : 'text-gray-500'} cursor-pointer`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 3h14a2 2 0 012 2v16l-7-4-7 4V5a2 2 0 012-2z"
      />
    </svg>
  )
}
