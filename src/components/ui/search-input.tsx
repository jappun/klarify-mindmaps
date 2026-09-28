import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Klarify's rounded search field (Records + Clients pages).
export function SearchInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <div className="absolute left-4 flex items-center">
        <Search size={16} className="text-klarify-neutral-700" />
      </div>
      <input
        type="text"
        className="flex h-11 w-full max-w-80 rounded-full border border-klarify-neutral-200 bg-white px-4 py-3 pl-10 font-normal text-klarify-neutral-500 text-sm tracking-normal shadow transition-colors placeholder:text-klarify-neutral-500 focus:ring-0 focus-visible:outline-hidden focus-visible:ring-0"
        {...props}
      />
    </div>
  );
}
