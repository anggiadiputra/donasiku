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
// Settings Page Skeleton
export const SettingsPageSkeleton = () => (
    <div>
        {/* Header Skeleton */}
        <div className="mb-6">
            <SkeletonBox className="h-8 w-64 mb-2" />
            <SkeletonBox className="h-4 w-48" />
        </div>

        {/* Settings Sections - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1 Skeleton */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <SkeletonBox className="w-10 h-10 rounded-lg" />
                    <SkeletonBox className="h-6 w-48" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <SkeletonBox className="h-4 w-32 mb-2" />
                        <SkeletonBox className="h-10 w-full rounded-lg mb-2" />
                        <SkeletonBox className="h-3 w-40" />
                    </div>
                    <div>
                        <SkeletonBox className="h-4 w-32 mb-2" />
                        <div className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                            <SkeletonBox className="w-8 h-8 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2 Skeleton */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <SkeletonBox className="w-10 h-10 rounded-lg" />
                    <SkeletonBox className="h-6 w-32" />
                </div>
                <div>
                    <SkeletonBox className="h-4 w-32 mb-2" />
                    <div className="flex gap-3">
                        <SkeletonBox className="w-12 h-12 rounded-lg" />
                        <SkeletonBox className="h-12 flex-1 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Card 3 Skeleton (List) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <SkeletonBox className="w-10 h-10 rounded-lg" />
                    <SkeletonBox className="h-6 w-40" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <SkeletonBox key={i} className="h-12 w-full rounded-lg" />
                    ))}
                </div>
            </div>

            {/* Card 4 Skeleton */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <SkeletonBox className="w-10 h-10 rounded-lg" />
                    <SkeletonBox className="h-6 w-48" />
                </div>
                <div className="space-y-4">
                    <SkeletonBox className="h-10 w-full rounded-lg" />
                    <SkeletonBox className="h-10 w-full rounded-lg" />
                </div>
            </div>
        </div>
    </div>
);

// Payment Status Page Skeleton
export const PaymentStatusSkeleton = () => (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
        <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative p-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 mt-16">
                {/* Status Header Skeleton */}
                <div className="p-8 text-center bg-gray-50 border-b border-gray-100">
                    <SkeletonCircle size="w-20 h-20 mx-auto mb-4" />
                    <SkeletonBox className="h-8 w-48 mx-auto mb-2" />
                    <SkeletonBox className="h-4 w-32 mx-auto" />
                </div>

                {/* Transaction Details Skeleton */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <SkeletonBox className="h-4 w-24 mb-2" />
                            <SkeletonBox className="h-6 w-32" />
                        </div>
                        <SkeletonBox className="w-8 h-8 rounded" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <SkeletonBox className="h-4 w-24 mb-2" />
                            <SkeletonBox className="h-6 w-40" />
                        </div>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-100">
                        <SkeletonBox className="h-4 w-24 mb-2" />
                        <SkeletonBox className="h-8 w-48" />
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                        <SkeletonBox className="h-4 w-24 mb-2" />
                        <SkeletonBox className="h-4 w-32 mb-1" />
                        <SkeletonBox className="h-4 w-40" />
                    </div>
                </div>
            </div>

            {/* Action Buttons Skeleton */}
            <div className="space-y-3">
                <SkeletonBox className="h-12 w-full rounded-lg" />
                <SkeletonBox className="h-12 w-full rounded-lg" />
            </div>
        </div>
    </div>
);

// Campaigns List Page Skeleton
export const CampaignsListPageSkeleton = () => (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
        <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
            {/* Header Skeleton */}
            <div className="bg-white sticky top-0 z-10 border-b border-gray-200">
                <div className="px-4 py-4 flex items-center gap-4">
                    <SkeletonCircle size="w-9 h-9" />
                    <SkeletonBox className="h-6 w-48" />
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                {/* Search & Filter Skeleton */}
                <div className="mb-6 space-y-3">
                    <SkeletonBox className="h-12 w-full rounded-lg" />
                    <SkeletonBox className="h-12 w-full rounded-lg" />
                </div>

                {/* List Skeleton */}
                <CampaignListSkeleton count={4} />
            </div>
        </div>
    </div>
);

// Dashboard Skeleton (New Design: Cards + Charts + Table)
export const DashboardSkeleton = () => (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans">
        {/* Sidebar Skeleton */}
        <div className="hidden md:block w-64 bg-white border-r border-gray-200 p-4 space-y-4">
            <SkeletonBox className="h-8 w-32 mb-8" />
            {[1, 2, 3, 4, 5, 6].map(i => (
                <SkeletonBox key={i} className="h-10 w-full rounded-lg" />
            ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
            {/* Header Skeleton */}
            <div className="bg-white border-b border-gray-100 p-4 flex justify-between items-center">
                <div>
                    <SkeletonBox className="h-6 w-48 mb-2" />
                    <SkeletonBox className="h-4 w-32" />
                </div>
                <div className="flex gap-3">
                    <SkeletonBox className="h-9 w-64 rounded-full" />
                    <SkeletonBox className="h-9 w-24 rounded-lg" />
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 overflow-y-auto">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 h-[150px] flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <SkeletonBox className="h-3 w-20 mb-2" />
                                    <SkeletonBox className="h-8 w-32" />
                                </div>
                                <SkeletonBox className="h-10 w-20" />
                            </div>
                            <SkeletonBox className="h-6 w-24 rounded-full self-start" />
                        </div>
                    ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 h-[400px]">
                        <div className="flex justify-between mb-6">
                            <SkeletonBox className="h-6 w-32" />
                            <SkeletonBox className="h-8 w-48 rounded-lg" />
                        </div>
                        <SkeletonBox className="h-full w-full rounded-lg" />
                    </div>
                    {/* Side Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 h-[400px]">
                        <SkeletonBox className="h-6 w-32 mb-6" />
                        <SkeletonBox className="h-full w-full rounded-lg" />
                    </div>
                </div>

                {/* Table Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex justify-between mb-6">
                        <SkeletonBox className="h-5 w-48" />
                        <SkeletonBox className="h-5 w-24" />
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex justify-between gap-4">
                                <SkeletonBox className="h-12 flex-1" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Invoice Page Skeleton
export const InvoicePageSkeleton = () => (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
        <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
            <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-8">
                    <SkeletonBox className="h-8 w-48" />
                    <SkeletonBox className="h-8 w-24 rounded-full" />
                </div>

                <SkeletonBox className="h-4 w-64 mb-6" />

                {/* Details Skeleton */}
                <div className="space-y-4 mb-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex justify-between">
                            <SkeletonBox className="h-4 w-24" />
                            <SkeletonBox className="h-4 w-32" />
                        </div>
                    ))}
                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between">
                            <SkeletonBox className="h-5 w-20" />
                            <SkeletonBox className="h-5 w-32" />
                        </div>
                    </div>
                </div>

                {/* QR Code Skeleton */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6 flex flex-col items-center">
                    <SkeletonBox className="h-4 w-48 mb-4" />
                    <SkeletonBox className="h-48 w-48 rounded-lg mb-4" />
                    <SkeletonBox className="h-3 w-64" />
                </div>

                {/* Button Skeleton */}
                <SkeletonBox className="h-14 w-full rounded-lg mb-4" />
                <div className="flex gap-3">
                    <SkeletonBox className="h-10 flex-1 rounded-lg" />
                    <SkeletonBox className="h-10 flex-1 rounded-lg" />
                </div>
            </div>
        </div>
    </div>
);

// Zakat Page Skeleton
export const ZakatPageSkeleton = () => (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
        <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
            <div className="flex-1 overflow-y-auto no-scrollbar p-0">
                {/* Header Skeleton */}
                <div className="px-4 py-4 flex items-center justify-between border-b border-gray-100">
                    <SkeletonCircle size="w-8 h-8" />
                    <SkeletonBox className="h-6 w-32" />
                    <SkeletonCircle size="w-8 h-8" />
                </div>

                <div className="px-4 py-6 space-y-6">
                    {/* Title */}
                    <SkeletonBox className="h-8 w-64" />

                    {/* Type Grid */}
                    <div className="grid grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
                                <SkeletonCircle size="w-12 h-12" />
                                <SkeletonBox className="h-3 w-16" />
                            </div>
                        ))}
                    </div>

                    {/* Frequency */}
                    <div className="flex gap-4">
                        <SkeletonBox className="h-6 w-24" />
                        <SkeletonBox className="h-6 w-24" />
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <SkeletonBox className="h-4 w-32 mb-2" />
                            <SkeletonBox className="h-12 w-full rounded-lg" />
                        </div>
                        <div>
                            <SkeletonBox className="h-4 w-48 mb-2" />
                            <SkeletonBox className="h-12 w-full rounded-lg" />
                        </div>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <SkeletonBox className="h-4 w-48" />
                        <SkeletonBox className="h-6 w-12 rounded-full" />
                    </div>

                    {/* Result Box */}
                    <SkeletonBox className="h-14 w-full rounded-lg" />
                </div>
            </div>

            {/* Bottom Bar Skeleton */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
                <SkeletonBox className="h-12 w-full rounded-lg" />
            </div>
        </div>
    </div>
);

// Campaign Donors Skeleton
export const CampaignDonorsSkeleton = () => (
    <div className="flex flex-col h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white border-b border-gray-100 flex items-center px-4 py-3 sticky top-0 z-10">
            <SkeletonCircle size="w-9 h-9" />
            <div className="ml-2 flex-1">
                <SkeletonBox className="h-5 w-24 mb-1" />
                <SkeletonBox className="h-3 w-40" />
            </div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-[61px] z-10">
            <SkeletonBox className="h-10 w-full rounded-lg" />
        </div>

        {/* List Skeleton */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex gap-4 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                    <SkeletonCircle size="w-10 h-10" />
                    <div className="flex-1">
                        <SkeletonBox className="h-4 w-32 mb-2" />
                        <SkeletonBox className="h-3 w-48 mb-1" />
                        <SkeletonBox className="h-2 w-24" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// Campaign Prayers Skeleton
export const CampaignPrayersSkeleton = () => (
    <div className="flex flex-col h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white border-b border-gray-100 flex items-center px-4 py-3 sticky top-0 z-10">
            <SkeletonCircle size="w-9 h-9" />
            <div className="ml-2 flex-1">
                <SkeletonBox className="h-5 w-24 mb-1" />
                <SkeletonBox className="h-3 w-40" />
            </div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-[61px] z-10">
            <SkeletonBox className="h-10 w-full rounded-lg" />
        </div>

        {/* List Skeleton */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <SkeletonBox className="h-4 w-32" />
                            <SkeletonBox className="h-3 w-20" />
                        </div>
                    </div>

                    <div className="space-y-2 mb-4">
                        <SkeletonBox className="h-3 w-full" />
                        <SkeletonBox className="h-3 w-5/6" />
                        <SkeletonBox className="h-3 w-4/6" />
                    </div>

                    <SkeletonBox className="h-8 w-24 rounded-full" />
                </div>
            ))}
        </div>
    </div>
);
