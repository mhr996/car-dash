'use client';
import React from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';

interface DateInputProps {
    value: string; // ISO date string: "YYYY-MM-DD"
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
}

// Cast to any because react-flatpickr's TS types are incomplete — it does pass
// unknown props (id, placeholder, disabled) through to the underlying <input>.
const FlatpickrInput = Flatpickr as any;

const DateInput: React.FC<DateInputProps> = ({ value, onChange, className = 'form-input', placeholder = 'DD/MM/YYYY', disabled = false, id }) => {
    // Pass a Date object so Flatpickr formats it — never let it parse an ISO string with d/m/Y format
    const dateValue = value ? new Date(value + 'T00:00:00') : undefined;

    return (
        <FlatpickrInput
            value={dateValue}
            options={{
                dateFormat: 'd/m/Y',
                allowInput: true,
                disableMobile: true,
            }}
            onChange={(dates: Date[]) => {
                if (dates.length > 0) {
                    const d = dates[0];
                    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    onChange(iso);
                } else {
                    onChange('');
                }
            }}
            className={className}
            placeholder={placeholder}
            disabled={disabled}
            id={id}
        />
    );
};

export default DateInput;
