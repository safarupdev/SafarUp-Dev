/**
 * Repeatable string-list editor — Destination `highlights[]` (§13) and
 * `gallery[]` (§10), both REQUIRED/OPTIONAL structured lists in the contract
 * and therefore each entry gets its own labelled control rather than being
 * folded into one textarea.
 *
 * Built on react-hook-form's `useFieldArray`, so reordering, insertion and
 * removal all keep stable keys across re-renders. Blank rows are tolerated
 * while editing and dropped before validation
 * (validators/content.schema.js `cleanList`).
 *
 * Ordering matters for highlights, so up/down controls are provided.
 */

import { useFieldArray } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function StringListEditor({
  control,
  name,
  register,
  errors,
  label,
  description,
  placeholder,
  addLabel = 'Add entry',
  emptyLabel = 'No entries yet.',
  max,
  reorderable = true,
  inputType = 'text',
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name });
  const rowErrors = errors?.[name];

  const isFull = typeof max === 'number' && fields.length >= max;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">
            {label}
            <span className="ml-2 font-normal text-slate-500">
              ({fields.length}
              {typeof max === 'number' ? ` / ${max}` : ''})
            </span>
          </p>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        <Button
          variant="secondary"
          className="flex-none"
          disabled={isFull}
          onClick={() => append('')}
          title={isFull ? `Maximum of ${max} entries` : undefined}
        >
          {addLabel}
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
          {emptyLabel}
        </p>
      )}

      {typeof rowErrors?.message === 'string' && (
        <p className="text-sm text-red-600" role="alert">
          {rowErrors.message}
        </p>
      )}
      {typeof rowErrors?.root?.message === 'string' && (
        <p className="text-sm text-red-600" role="alert">
          {rowErrors.root.message}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {fields.map((field, index) => {
          const fieldId = `${name}-${index}`;
          const message = rowErrors?.[index]?.message;
          return (
            <li key={field.id} className="flex items-start gap-2">
              <span aria-hidden="true" className="w-6 flex-none pt-2 text-right text-xs text-slate-400">
                {index + 1}.
              </span>
              <div className="flex-1">
                <Input
                  id={fieldId}
                  type={inputType}
                  placeholder={placeholder}
                  aria-label={`${label} ${index + 1}`}
                  error={Boolean(message)}
                  {...register(`${name}.${index}`)}
                />
                {message && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {message}
                  </p>
                )}
              </div>
              <div className="flex flex-none gap-1 pt-0.5">
                {reorderable && (
                  <>
                    <button
                      type="button"
                      onClick={() => move(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Move ${label} ${index + 1} up`}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, index + 1)}
                      disabled={index === fields.length - 1}
                      aria-label={`Move ${label} ${index + 1} down`}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${label} ${index + 1}`}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-red-50 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
