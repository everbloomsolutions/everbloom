// src/components/forms/FormInput.jsx
import { Lock, Key, Mail, User, Phone } from 'lucide-react';

const FormInput = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  error = '',
  helperText = '',
  className = '',
  autoComplete,
  icon,
  ...props
}) => {
  // Determine icon based on input type or name if icon prop not provided
  const getIcon = () => {
    if (icon) return icon;
    if (type === 'password') {
      if (name === 'currentPassword') return Lock;
      return Key;
    }
    if (type === 'email') return Mail;
    if (name === 'name' || name === 'username') return User;
    if (name === 'phone') return Phone;
    return null;
  };

  const IconComponent = getIcon();

  return (
    <div className={`w-full mb-4 ${className}`}>
      {label && (
        <label 
          htmlFor={name} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {IconComponent && (
          <IconComponent className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
        )}
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={!!required}
          disabled={!!disabled}
          aria-required={!!required}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${name}-error` : helperText ? `${name}-helper` : undefined
          }
          {...(autoComplete && { autoComplete })}
          className={`
            w-full px-4 py-2 border rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-700
            ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
            ${disabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}
            ${IconComponent ? 'pl-10' : ''}
            dark:bg-gray-700 dark:text-white
          `}
          {...props}
        />
      </div>
      
      {error && (
        <p 
          id={`${name}-error`}
          className="mt-1 text-sm text-red-600 dark:text-red-400" 
          role="alert"
        >
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p 
          id={`${name}-helper`}
          className="mt-1 text-sm text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
};

export default FormInput;
