import { FormField } from "./FormField";
import { monthNames } from "../utils/periodFilters";

export function PeriodFilter({ filters, idPrefix, onChange }) {
  return (
    <>
      <FormField id={`${idPrefix}Mode`} label="Periodo">
        <select
          id={`${idPrefix}Mode`}
          onChange={(event) => onChange("mode", event.target.value)}
          value={filters.mode}
        >
          <option value="month">Mes</option>
          <option value="year">Año</option>
          <option value="range">Rango</option>
        </select>
      </FormField>

      {filters.mode === "month" ? (
        <FormField id={`${idPrefix}Month`} label="Mes">
          <select
            id={`${idPrefix}Month`}
            onChange={(event) => onChange("month", event.target.value)}
            value={filters.month}
          >
            <option value="">Todos</option>
            {monthNames.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}

      {filters.mode !== "range" ? (
        <FormField id={`${idPrefix}Year`} label="Año">
          <input
            id={`${idPrefix}Year`}
            onChange={(event) => onChange("year", event.target.value)}
            type="number"
            value={filters.year}
          />
        </FormField>
      ) : (
        <>
          <FormField id={`${idPrefix}From`} label="Desde">
            <input
              id={`${idPrefix}From`}
              onChange={(event) => onChange("dateFrom", event.target.value)}
              type="date"
              value={filters.dateFrom}
            />
          </FormField>
          <FormField id={`${idPrefix}To`} label="Hasta">
            <input
              id={`${idPrefix}To`}
              onChange={(event) => onChange("dateTo", event.target.value)}
              type="date"
              value={filters.dateTo}
            />
          </FormField>
        </>
      )}
    </>
  );
}
