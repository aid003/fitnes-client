"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./searchable-select.module.css";

export type SearchableSelectOption = {
  id: string;
  label: string;
  sublabel?: string;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
};

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function matchesQuery(option: SearchableSelectOption, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [option.label, option.sublabel].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query);
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Поиск...",
  emptyMessage = "Ничего не найдено",
  required = false,
  disabled = false,
  name,
}: SearchableSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const query = normalizeSearchValue(searchQuery);
    return options.filter((option) => matchesQuery(option, query));
  }, [options, searchQuery]);

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(0);
  };

  const openDropdown = () => {
    if (disabled) {
      return;
    }

    setIsOpen(true);

    const selectedIndex = filteredOptions.findIndex((option) => option.id === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const selectOption = (optionId: string) => {
    onChange(optionId);
    closeDropdown();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (highlightedIndex < filteredOptions.length) {
      return;
    }

    setHighlightedIndex(filteredOptions.length > 0 ? filteredOptions.length - 1 : 0);
  }, [filteredOptions.length, highlightedIndex]);

  return (
    <div className={styles.root} ref={rootRef}>
      {required ? (
        <input
          className={styles.hiddenInput}
          type="text"
          name={name}
          value={value}
          required
          readOnly
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}

      <button
        type="button"
        className={[styles.trigger, isOpen ? styles.triggerOpen : ""].filter(Boolean).join(" ")}
        onClick={() => {
          if (isOpen) {
            closeDropdown();
            return;
          }

          openDropdown();
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
      >
        <span
          className={[
            styles.triggerLabel,
            selectedOption ? "" : styles.triggerPlaceholder,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={[styles.chevron, isOpen ? styles.chevronOpen : ""].filter(Boolean).join(" ")}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className={styles.dropdown}>
          <input
            ref={searchInputRef}
            className={styles.searchInput}
            type="search"
            value={searchQuery}
            placeholder={searchPlaceholder}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeDropdown();
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlightedIndex((current) =>
                  filteredOptions.length === 0 ? 0 : Math.min(current + 1, filteredOptions.length - 1),
                );
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlightedIndex((current) => Math.max(current - 1, 0));
                return;
              }

              if (event.key === "Enter") {
                event.preventDefault();
                const option = filteredOptions[highlightedIndex];
                if (option) {
                  selectOption(option.id);
                }
              }
            }}
          />

          {filteredOptions.length > 0 ? (
            <ul className={styles.list} id={listboxId} role="listbox">
              {filteredOptions.map((option, index) => {
                const isSelected = option.id === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li key={option.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={[
                        styles.option,
                        isSelected ? styles.optionSelected : "",
                        isHighlighted ? styles.optionHighlighted : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => selectOption(option.id)}
                    >
                      <span className={styles.optionLabel}>{option.label}</span>
                      {option.sublabel ? (
                        <span className={styles.optionSublabel}>{option.sublabel}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.emptyState}>{emptyMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
