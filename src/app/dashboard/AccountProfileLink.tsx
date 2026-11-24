"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { useRememberDirectoryScroll, type AccountDirectory } from "./DashboardState";

export default function AccountProfileLink({ directory, id, name }: { directory: AccountDirectory; id: string; name: string }) {
  const rememberScroll = useRememberDirectoryScroll(directory);
  return (
    <Link
      href={`/dashboard/${directory}/${encodeURIComponent(id)}`}
      onNavigate={rememberScroll}
      aria-label={`View profile for ${name}`}
      title="View profile"
      className="grid h-9 w-9 place-items-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
    >
      <Eye aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}
