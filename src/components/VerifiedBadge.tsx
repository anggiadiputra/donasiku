
interface VerifiedBadgeProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function VerifiedBadge({ className = '', size = 'md' }: VerifiedBadgeProps) {
    const sizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-6 h-6'
    };

    return (
        <svg
            className={`text-blue-500 ${sizeClasses[size]} ${className}`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z"
                fill="currentColor"
            />
            <path
                d="m9 12 2 2 4-4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
