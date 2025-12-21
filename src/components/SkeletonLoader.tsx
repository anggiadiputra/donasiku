// Skeleton/Shimmer Loading Components
export const SkeletonBox = ({ className = '' }: { className?: string }) => (
    <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
);

export const SkeletonText = ({
    lines = 1,
    className = ''
}: {
    lines?: number;
    className?: string;
}) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <div
                key={i}
                className={`h-4 bg-gray-200 rounded animate-pulse ${i === lines - 1 ? 'w-3/4' : 'w-full'
                    }`}
            />
        ))}
    </div>
);

export const SkeletonCircle = ({ size = 'w-12 h-12' }: { size?: string }) => (
    <div className={`${size} bg-gray-200 rounded-full animate-pulse`} />
);

export const SkeletonImage = ({
    className = 'w-full h-48'
}: {
    className?: string;
}) => (
    <div className={`${className} bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-shimmer bg-[length:200%_100%]`} />
);

// Campaign Card Skeleton
export const CampaignCardSkeleton = () => (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 w-full flex">
        {/* Image skeleton */}
        <div className="w-32 h-32 flex-shrink-0">
            <SkeletonImage className="w-full h-full" />
        </div>

        {/* Content skeleton */}
        <div className="p-3 flex-1 flex flex-col justify-between">
            <div>
                <SkeletonText lines={1} className="mb-2 w-1/2" />
                <SkeletonText lines={2} className="mb-2" />
            </div>

            <div className="flex justify-between items-end gap-2">
                <div className="flex-1">
                    <SkeletonBox className="h-3 w-16 mb-1" />
                    <SkeletonBox className="h-5 w-24" />
                </div>
                <div className="text-right">
                    <SkeletonBox className="h-3 w-12 mb-1" />
                    <SkeletonBox className="h-5 w-8" />
                </div>
            </div>
        </div>
    </div>
);

// Campaign Page Skeleton
export const CampaignPageSkeleton = () => (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
        <div className="w-full max-w-[480px] bg-white flex flex-col h-full shadow-2xl relative">
            <div className="flex-1 overflow-y-auto">
                {/* Header Image Skeleton */}
                <SkeletonImage className="w-full h-[220px]" />

                <div className="px-5 py-6">
                    {/* Organization Info Skeleton */}
                    <div className="flex items-center gap-2 mb-3">
                        <SkeletonCircle size="w-8 h-8" />
                        <SkeletonBox className="h-4 w-32" />
                    </div>

                    {/* Title Skeleton */}
                    <SkeletonText lines={2} className="mb-4" />

                    {/* Stats Skeleton */}
                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-1">
                            <SkeletonBox className="h-3 w-24" />
                            <SkeletonBox className="h-3 w-20" />
                        </div>
                        <SkeletonBox className="h-8 w-40 mb-2" />
                        <SkeletonBox className="h-2 w-full mb-3 rounded-full" />
                        <div className="flex justify-between">
                            <SkeletonBox className="h-4 w-24" />
                            <SkeletonBox className="h-4 w-32" />
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-2 bg-gray-50 w-full" />

                {/* Description Skeleton */}
                <div className="px-5 py-6">
                    <SkeletonBox className="h-5 w-48 mb-4" />
                    <SkeletonText lines={5} />
                </div>
            </div>

            {/* Footer Skeleton */}
            <div className="border-t border-gray-200 bg-white p-4">
                <div className="flex gap-3">
                    <SkeletonBox className="w-12 h-12 rounded" />
                    <SkeletonBox className="flex-1 h-12 rounded" />
                </div>
            </div>
        </div>
    </div>
);

// Donation Form Skeleton
export const DonationFormSkeleton = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 py-6">
            {/* Header Skeleton */}
            <div className="flex items-center gap-4 mb-6">
                <SkeletonCircle size="w-10 h-10" />
                <SkeletonBox className="h-6 w-48" />
            </div>

            {/* Campaign Image Skeleton */}
            <SkeletonImage className="w-full h-48 rounded-lg mb-6" />

            {/* Amount Options Skeleton */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <SkeletonBox key={i} className="h-16 rounded-lg" />
                ))}
            </div>

            {/* Form Fields Skeleton */}
            <div className="space-y-4">
                <SkeletonBox className="h-12 rounded-lg" />
                <SkeletonBox className="h-12 rounded-lg" />
                <SkeletonBox className="h-12 rounded-lg" />
                <SkeletonBox className="h-24 rounded-lg" />
            </div>
        </div>
    </div>
);

// List Skeleton (for campaign lists)
export const CampaignListSkeleton = ({ count = 3 }: { count?: number }) => (
    <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
        ))}
    </div>
);

// Table Row Skeleton
export const TableRowSkeleton = ({ columns = 7 }: { columns?: number }) => (
    <tr>
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="px-6 py-4">
                <SkeletonBox className="h-4 w-full" />
            </td>
        ))}
    </tr>
);

// Table Skeleton (multiple rows)
export const TableSkeleton = ({
    rows = 5,
    columns = 7
}: {
    rows?: number;
    columns?: number;
}) => (
    <>
        {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
        ))}
    </>
);

// Fidyah Page Skeleton
export const FidyahSkeleton = () => (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
        <div className="w-full max-w-[480px] bg-white flex flex-col h-full shadow-2xl relative">
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Hero Image Skeleton */}
                <SkeletonImage className="w-full h-[220px]" />

                <div className="p-4 mb-2">
                    {/* Title Skeleton */}
                    <SkeletonBox className="h-7 w-3/4 mb-3" />

                    {/* Stats Skeleton */}
                    <div className="flex items-center gap-2 mb-6">
                        <SkeletonBox className="h-4 w-8" />
                        <SkeletonBox className="h-4 w-48" />
                    </div>

                    {/* Calculator Skeleton */}
                    <div className="space-y-4">
                        <SkeletonBox className="h-4 w-40 ml-1" />
                        <SkeletonBox className="h-14 w-full rounded-lg" />

                        <div className="flex items-center gap-4 mt-4">
                            <SkeletonBox className="h-4 w-24" />
                            <div className="flex items-center gap-0 ml-auto">
                                <SkeletonBox className="h-10 w-10 rounded-l-lg" />
                                <SkeletonBox className="h-10 w-12" />
                                <SkeletonBox className="h-10 w-10 rounded-r-lg" />
                            </div>
                        </div>

                        {/* Note Box Skeleton */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <SkeletonBox className="h-4 w-48 mb-2" />
                            <SkeletonText lines={2} />
                        </div>

                        {/* Description Skeleton */}
                        <div className="mt-4">
                            <SkeletonText lines={4} />
                            <SkeletonBox className="w-full h-8 mt-2 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar Skeleton */}
            <div className="border-t border-gray-100 bg-white p-3 z-20">
                <div className="flex items-center justify-between gap-4">
                    <SkeletonCircle size="w-10 h-10" />
                    <SkeletonCircle size="w-10 h-10" />
                    <SkeletonBox className="h-10 flex-1 rounded-lg" />
                </div>
            </div>
        </div>
    </div>
);
