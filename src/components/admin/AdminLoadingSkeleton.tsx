import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** Reusable skeleton for admin pages while loading Supabase data */

export const DashboardSkeleton = memo(() => (
  <div className="space-y-4 md:space-y-6 animate-in fade-in duration-200">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton className="h-4 w-40" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-[140px] rounded-md" />
        <Skeleton className="h-8 w-[130px] rounded-md" />
        <Skeleton className="h-8 w-[100px] rounded-md" />
      </div>
    </div>
    {/* KPI Cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-4 pb-3 px-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
    {/* Funnel */}
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-3 flex-1 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
    {/* Pipeline */}
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
));
DashboardSkeleton.displayName = "DashboardSkeleton";

export const LeadsSkeleton = memo(() => (
  <div className="space-y-3 md:space-y-6 animate-in fade-in duration-200">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-3 pb-2 px-3">
            <Skeleton className="h-3 w-14 mb-1" />
            <Skeleton className="h-6 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Skeleton className="h-9 w-full rounded-md" />
    <Skeleton className="h-8 w-full rounded-md" />
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3 flex items-center gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16 rounded ml-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
));
LeadsSkeleton.displayName = "LeadsSkeleton";

export const TableSkeleton = memo(({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-4 animate-in fade-in duration-200">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-24 rounded-md" />
    </div>
    <Skeleton className="h-9 w-full rounded-md" />
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-3 flex items-center gap-4">
              {Array.from({ length: cols }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
));
TableSkeleton.displayName = "TableSkeleton";
