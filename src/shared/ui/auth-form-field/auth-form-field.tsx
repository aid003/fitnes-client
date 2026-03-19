"use client";

import { useState } from "react";
import styles from "./auth-form-field.module.css";

type AuthFormFieldProps = {
  label: string;
  placeholder: string;
  type: string;
  autoComplete?: string;
  value: string;
  error?: string;
  sideText?: string;
  onChange: (value: string) => void;
};

export function AuthFormField({
  label,
  placeholder,
  type,
  autoComplete,
  value,
  error,
  sideText,
  onChange,
}: AuthFormFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = type === "password";
  const inputType = isPasswordField && isPasswordVisible ? "text" : type;

  return (
    <label className={styles.field}>
      <span className={styles.meta}>
        <span className={styles.label}>{label}</span>
        {error ? (
          <span className={styles.error}>{error}</span>
        ) : sideText ? (
          <span className={styles.sideText}>{sideText}</span>
        ) : null}
      </span>
      <span className={styles.inputWrap}>
        <input
          className={[
            styles.input,
            isPasswordField ? styles.inputWithToggle : "",
            error ? styles.inputError : "",
          ]
            .filter(Boolean)
            .join(" ")}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />

        {isPasswordField ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
            aria-label={isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}
            aria-pressed={isPasswordVisible}
          >
            {isPasswordVisible ? "Скрыть" : "Показать"}
          </button>
        ) : null}
      </span>
    </label>
  );
}
