import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5),inset_0_1px_0_hsl(150_100%_70%/0.2)] hover:shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.6)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_4px_20px_-4px_hsl(var(--destructive)/0.5)]",
        outline: "border-2 border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-primary/10 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "relative overflow-hidden bg-gradient-to-r from-[hsl(150_80%_45%)] via-[hsl(160_80%_42%)] to-[hsl(170_80%_40%)] text-primary-foreground font-black text-lg py-6 px-10 shadow-[0_8px_32px_-8px_hsl(150_80%_45%/0.6),inset_0_1px_0_hsl(150_100%_70%/0.3)] hover:shadow-[0_12px_40px_-8px_hsl(150_80%_45%/0.7)] hover:scale-[1.03] active:scale-[0.98]",
        accent: "bg-gradient-to-r from-accent via-[hsl(40_100%_52%)] to-[hsl(35_100%_50%)] text-accent-foreground font-bold shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.5)]",
        military: "bg-gradient-to-r from-[hsl(85_50%_25%)] to-[hsl(90_45%_20%)] text-foreground border border-olive/30 hover:border-olive/50 shadow-[0_4px_20px_-4px_hsl(85_50%_25%/0.4)]",
        neon: "relative bg-transparent border-2 border-primary text-primary hover:bg-primary/10 shadow-[0_0_20px_hsl(150_100%_50%/0.3)] hover:shadow-[0_0_30px_hsl(150_100%_50%/0.5)] animate-pulse-neon",
        glass: "bg-card/50 backdrop-blur-xl border border-border/50 text-foreground hover:bg-card/70 hover:border-primary/30",
        google: "bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-200 shadow-md hover:shadow-lg",
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-10 rounded-xl px-4 text-sm",
        lg: "h-14 rounded-2xl px-8 text-base",
        xl: "h-16 rounded-2xl px-12 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
