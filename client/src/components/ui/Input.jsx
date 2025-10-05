/**
 * Input Component
 * 
 * Reusable form input with label and error states
 */

import './Input.css';

export default function Input({
  label,
  error,
  type = 'text',
  id,
  name,
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
  icon,
  ...props
}) {
  const inputId = id || name;

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          id={inputId}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`input ${error ? 'input-error' : ''} ${icon ? 'input-with-icon' : ''}`}
          {...props}
        />
      </div>
      
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
}
