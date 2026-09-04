"use client";

import type { OnboardingFieldUi, StructuredItemField } from "@/lib/onboarding/field-ui";

type EditorProps = {
  field: OnboardingFieldUi;
  value: unknown;
  disabled?: boolean;
  onChange: (next: unknown) => void;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry ?? "")) : [""];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry) => entry && typeof entry === "object") as Record<string, unknown>[]
    : [];
}

function emptyStructuredItem(fields: ReadonlyArray<StructuredItemField>): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const field of fields) {
    item[field.key] = "";
  }
  return item;
}

export function OnboardingFieldEditor({ field, value, disabled, onChange }: EditorProps) {
  const id = `field-${field.fieldKey.replace(/\./g, "-")}`;

  if (field.editor === "choice" && field.choices) {
    const selected = asString(value);
    return (
      <fieldset className="field-editor" disabled={disabled}>
        <legend>{field.label}</legend>
        {field.helpText ? <p className="muted">{field.helpText}</p> : null}
        <div className="choice-row" role="group" aria-label={field.label}>
          {field.choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className={selected === choice.value ? "active" : "secondary"}
              aria-pressed={selected === choice.value}
              onClick={() => onChange(choice.value)}
            >
              {choice.label}
            </button>
          ))}
        </div>
        {field.removable && selected ? (
          <button
            type="button"
            className="secondary"
            onClick={() => onChange("")}
          >
            Clear selection
          </button>
        ) : null}
      </fieldset>
    );
  }

  if (field.editor === "short_text" || field.editor === "long_text") {
    const Tag = field.editor === "long_text" ? "textarea" : "input";
    return (
      <label htmlFor={id}>
        <span>{field.label}</span>
        {field.helpText ? <span className="muted">{field.helpText}</span> : null}
        <Tag
          id={id}
          value={asString(value)}
          disabled={disabled}
          rows={field.editor === "long_text" ? 4 : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (field.editor === "string_list" || field.editor === "url_list") {
    const rows = asStringArray(value);
    return (
      <fieldset className="field-editor" disabled={disabled}>
        <legend>{field.label}</legend>
        {field.helpText ? <p className="muted">{field.helpText}</p> : null}
        <div className="repeatable-list">
          {rows.map((row, index) => (
            <div key={`${field.fieldKey}-${index}`} className="repeatable-row">
              <label htmlFor={`${id}-${index}`}>
                <span className="visually-hidden">
                  {field.label} item {index + 1}
                </span>
                <input
                  id={`${id}-${index}`}
                  type={field.editor === "url_list" ? "url" : "text"}
                  value={row}
                  onChange={(event) => {
                    const next = [...rows];
                    next[index] = event.target.value;
                    onChange(next);
                  }}
                />
              </label>
              <button
                type="button"
                className="secondary"
                onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => onChange([...rows, ""])}>
            Add
          </button>
        </div>
      </fieldset>
    );
  }

  if (field.editor === "structured_list" && field.itemFields) {
    const rows = asObjectArray(value);
    return (
      <fieldset className="field-editor" disabled={disabled}>
        <legend>{field.label}</legend>
        <div className="repeatable-list">
          {rows.map((row, index) => (
            <div key={`${field.fieldKey}-${index}`} className="structured-item panel">
              {field.itemFields!.map((itemField) => {
                const itemId = `${id}-${index}-${itemField.key}`;
                const Tag = itemField.editor === "long_text" ? "textarea" : "input";
                return (
                  <label key={itemField.key} htmlFor={itemId}>
                    <span>
                      {itemField.label}
                      {itemField.required ? " *" : ""}
                    </span>
                    <Tag
                      id={itemId}
                      type={itemField.editor === "url" ? "url" : "text"}
                      value={asString(row[itemField.key])}
                      rows={itemField.editor === "long_text" ? 3 : undefined}
                      onChange={(event) => {
                        const next = rows.map((entry, rowIndex) =>
                          rowIndex === index
                            ? { ...entry, [itemField.key]: event.target.value }
                            : entry,
                        );
                        onChange(next);
                      }}
                    />
                  </label>
                );
              })}
              <button
                type="button"
                className="secondary"
                onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() => onChange([...rows, emptyStructuredItem(field.itemFields!)])}
          >
            Add
          </button>
        </div>
      </fieldset>
    );
  }

  if (field.editor === "contact_object") {
    const contact = asObject(value);
    const update = (key: string, nextValue: string) =>
      onChange({ ...contact, [key]: nextValue });
    return (
      <fieldset className="field-editor" disabled={disabled}>
        <legend>{field.label}</legend>
        {(
          [
            ["phone", "Phone"],
            ["email", "Email"],
            ["website", "Website"],
            ["other", "Other"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} htmlFor={`${id}-${key}`}>
            <span>{label}</span>
            <input
              id={`${id}-${key}`}
              type={key === "website" ? "url" : key === "email" ? "email" : "text"}
              value={asString(contact[key])}
              onChange={(event) => update(key, event.target.value)}
            />
          </label>
        ))}
      </fieldset>
    );
  }

  if (field.editor === "hours_object") {
    const hours = asObject(value);
    const entries = asObjectArray(hours.entries);
    return (
      <fieldset className="field-editor" disabled={disabled}>
        <legend>{field.label}</legend>
        <label htmlFor={`${id}-timezone`}>
          <span>Timezone</span>
          <input
            id={`${id}-timezone`}
            value={asString(hours.timezone)}
            onChange={(event) => onChange({ ...hours, timezone: event.target.value })}
          />
        </label>
        <label htmlFor={`${id}-summary`}>
          <span>Summary</span>
          <textarea
            id={`${id}-summary`}
            rows={3}
            value={asString(hours.summary)}
            onChange={(event) => onChange({ ...hours, summary: event.target.value })}
          />
        </label>
        <div className="repeatable-list">
          {entries.map((entry, index) => (
            <div key={`${id}-entry-${index}`} className="structured-item panel">
              {(
                [
                  ["days", "Days"],
                  ["open", "Open"],
                  ["close", "Close"],
                  ["notes", "Notes"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} htmlFor={`${id}-entry-${index}-${key}`}>
                  <span>{label}</span>
                  <input
                    id={`${id}-entry-${index}-${key}`}
                    value={asString(entry[key])}
                    onChange={(event) => {
                      const nextEntries = entries.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, [key]: event.target.value } : row,
                      );
                      onChange({ ...hours, entries: nextEntries });
                    }}
                  />
                </label>
              ))}
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  onChange({
                    ...hours,
                    entries: entries.filter((_, rowIndex) => rowIndex !== index),
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              onChange({
                ...hours,
                entries: [...entries, { days: "", open: "", close: "", notes: "" }],
              })
            }
          >
            Add hours entry
          </button>
        </div>
      </fieldset>
    );
  }

  return null;
}
