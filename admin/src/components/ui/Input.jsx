import { forwardRef } from 'react';

const Input = forwardRef(function Input({ error, className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
        error ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-brand-500'
      } ${className}`}
      {...rest}
    />
  );
});

export default Input;
