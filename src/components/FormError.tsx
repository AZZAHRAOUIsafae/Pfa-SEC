import { cn } from '../lib/utils';

interface FormErrorProps {
  message: string;
  className?: string;
}

export default function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        'text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2',
        className
      )}
    >
      {message}
    </p>
  );
}
