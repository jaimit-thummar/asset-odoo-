import React from "react";
import { cn } from "../../lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

/** Glass-panel card root */
export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-panel rounded-xl overflow-hidden",
        hover && "glass-panel-hover cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

function CardHeader({ children, className, action }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 pt-5 pb-3",
        className
      )}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}
CardHeader.displayName = "Card.Header";
Card.Header = CardHeader;

function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}
CardBody.displayName = "Card.Body";
Card.Body = CardBody;

function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-5 py-3 border-t border-slate-200/50 dark:border-slate-800/50",
        className
      )}
    >
      {children}
    </div>
  );
}
CardFooter.displayName = "Card.Footer";
Card.Footer = CardFooter;
