import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Verbatim from Klarify's Badge cva.
export const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold text-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "text-foreground",
        pillMuted: "rounded-full border-transparent bg-klarify-cloud-100 px-2 py-0.5 font-medium text-sidebar-muted text-sm",
        pillOcean:
          "rounded-full border-transparent bg-klarify-ocean-50 px-2 py-0.5 font-semibold text-klarify-ocean-700 text-xs capitalize",
        pillPeach:
          "rounded-full border-transparent bg-klarify-peach-50 px-2 py-0.5 font-semibold text-klarify-peach-700 text-xs capitalize",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
