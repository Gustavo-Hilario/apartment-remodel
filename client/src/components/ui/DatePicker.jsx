/**
 * Date Picker Component
 *
 * Reusable date picker with year/month dropdowns and custom styling
 */

'use client';

import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './DatePicker.css';

export default function DatePicker({
  selected,
  onChange,
  placeholderText = 'Select date',
  minDate = null,
  maxDate = null,
  isClearable = true,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <ReactDatePicker
      selected={selected}
      onChange={onChange}
      dateFormat="MMM d, yyyy"
      placeholderText={placeholderText}
      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      className={`date-picker-input ${className}`}
      isClearable={isClearable}
      minDate={minDate}
      maxDate={maxDate}
      disabled={disabled}
      {...props}
    />
  );
}
