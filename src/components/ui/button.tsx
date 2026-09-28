import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

// Verbatim from Klarify's Button cva.
export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center font-normal text-sm shadow transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "border border-klarify-neutral-200 bg-transparent hover:bg-klarify-cloud-100 hover:text-accent-foreground",
        primaryOutline:
          "border border-klarify-ocean-300 bg-klarify-ocean-50 font-semibold text-klarify-ocean-700 shadow-none hover:bg-klarify-ocean-50/70",
        secondary: "bg-secondary text-secondary-foreground shadow hover:bg-secondary/80",
        ghost: "shadow-none hover:bg-accent hover:text-accent-foreground",
        light: "h-11 bg-klarify-neutral-100 text-klarify-neutral-900 shadow",
        link: "text-primary underline-offset-4 shadow-none hover:underline",
        floating:
          "border border-klarify-cloud-100 bg-white text-sidebar-selected drop-shadow-xs hover:bg-klarify-gray-mod-50",
        unstyled: "shadow-none",
      },
      rounding: {
        default: "rounded-full",
        md: "rounded-md",
        sm: "rounded-sm",
        lg: "rounded-lg",
        none: "rounded-none",
      },
      size: {
        default: "h-10 px-3 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default", rounding: "default" },
  },
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, rounding, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size, rounding }), className)} {...props} />;
}
