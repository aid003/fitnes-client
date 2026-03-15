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
      <input
        className={[styles.input, error ? styles.inputError : ""].filter(Boolean).join(" ")}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
