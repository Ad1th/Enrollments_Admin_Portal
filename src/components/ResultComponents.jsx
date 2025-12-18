import React from 'react';
import styles from './Components.module.css';

export const Button = ({ children, onClick, variant = 'primary', style, ...props }) => {
  const baseStyle = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    ...style
  };

  const variants = {
    primary: {
      backgroundColor: 'var(--primary)',
      color: '#ffffff', // Always white on primary
      boxShadow: '0 4px 6px rgba(252, 122, 0, 0.25)'
    },
    outline: {
      backgroundColor: 'transparent',
      border: '1px solid var(--border-color)',
      color: 'var(--text-muted)'
    },
    danger: {
      backgroundColor: '#ef4444',
      color: 'white'
    }
  };

  return (
    <button 
      style={{ ...baseStyle, ...variants[variant] }} 
      onClick={onClick}
      {...props}
      onMouseEnter={(e) => {
        if(variant === 'primary') e.target.style.backgroundColor = 'var(--primary-hover)';
        if(variant === 'outline') {
            e.target.style.borderColor = 'var(--primary)';
            e.target.style.color = 'var(--primary)';
        }
      }}
      onMouseLeave={(e) => {
        if(variant === 'primary') e.target.style.backgroundColor = 'var(--primary)';
        if(variant === 'outline') {
            e.target.style.borderColor = 'var(--border-color)';
            e.target.style.color = 'var(--text-muted)';
        }
      }}
    >
      {children}
    </button>
  );
};

export const Input = ({ type = 'text', placeholder, value, onChange, style, ...props }) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={styles.input}
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        outline: 'none',
        fontSize: '14px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        backgroundColor: 'var(--bg-dark)',
        color: 'var(--text-main)',
        caretColor: 'var(--primary)',
        ...style
      }}
      {...props}
    />
  );
};

export const Card = ({ children, style, className }) => {
  return (
    <div className={className} style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: 'var(--shadow)',
      border: '1px solid var(--border-color)',
      color: 'var(--text-main)',
      ...style
    }}>
      {children}
    </div>
  );
};
