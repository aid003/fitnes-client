import Link from "next/link";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import styles from "./auth-action.module.css";

type AuthActionVariant = "primary" | "dim";

type AuthActionButtonProps = PropsWithChildren<{
  variant?: AuthActionVariant;
  className?: string;
  href?: never;
}> &
  ButtonHTMLAttributes<HTMLButtonElement>;

type AuthActionLinkProps = PropsWithChildren<{
  href: string;
  variant?: AuthActionVariant;
  className?: string;
}>;

type AuthActionProps = AuthActionButtonProps | AuthActionLinkProps;

export function AuthAction(props: AuthActionProps) {
  const variant = props.variant ?? "primary";
  const className = [
    styles.action,
    variant === "dim" ? styles.dim : styles.primary,
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  if ("href" in props && props.href) {
    const { children, href } = props;

    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  const {
    children,
    type = "button",
    ...buttonProps
  } = props as AuthActionButtonProps;

  return (
    <button {...buttonProps} type={type} className={className}>
      {children}
    </button>
  );
}
