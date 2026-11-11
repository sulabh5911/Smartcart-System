import React from 'react';

export function FormField({
  label,
  required = false,
  error,
  helperText,
  children,
  id
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          {label}
          {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
      {!error && helperText && (
        <span className="text-[11px] text-slate-400">{helperText}</span>
      )}
    </div>
  );
}

export function Input({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  className = '',
  min,
  max,
  step,
  ...props
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      className={`w-full px-3.5 py-2 bg-white border ${
        error ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
      } rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function Select({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  error,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-3.5 py-2 bg-white border ${
        error ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
      } rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value ?? opt} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  );
}

export function Textarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3.5 py-2 bg-white border ${
        error ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
      } rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 resize-none ${className}`}
      {...props}
    />
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  onClick,
  disabled = false,
  loading = false,
  className = '',
  icon: Icon,
  id
}) {
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm focus:ring-blue-200',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold focus:ring-slate-100',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm focus:ring-emerald-200',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm focus:ring-rose-200',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 font-medium'
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-3.5 py-2 text-xs rounded-lg gap-2',
    lg: 'px-4 py-2.5 text-sm rounded-lg gap-2.5'
  };

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
        variantStyles[variant] || variantStyles.primary
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
      ) : (
        Icon && <Icon className="w-4 h-4" />
      )}
      <span>{children}</span>
    </button>
  );
}
