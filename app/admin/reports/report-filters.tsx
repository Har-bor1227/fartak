"use client";

import {
  Download,
  Search,
} from "lucide-react";

import JalaliDatePicker from "@/components/shared/jalali-date-picker";

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

type ReportFiltersProps = {
  employees: EmployeeOption[];
  employeeId: string;
  from: string;
  to: string;
};

export default function ReportFilters({
  employees,
  employeeId,
  from,
  to,
}: ReportFiltersProps) {
  return (
    <form
      method="GET"
      className="grid gap-3"
    >
      <div>
        <label
          htmlFor="employee"
          className="mb-2 block text-xs font-semibold text-slate-600"
        >
          کارمند
        </label>

        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <select
            id="employee"
            name="employee"
            defaultValue={employeeId}
            className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
          >
            <option value="">
              انتخاب کارمند
            </option>

            {employees.map(
              (employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.firstName}{" "}
                  {employee.lastName} — @
                  {employee.username}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-600">
          از تاریخ
        </label>

        <JalaliDatePicker
          value={from}
          name="from"
          placeholder="انتخاب تاریخ شروع"
          max={to}
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-600">
          تا تاریخ
        </label>

        <JalaliDatePicker
          value={to}
          name="to"
          placeholder="انتخاب تاریخ پایان"
          min={from}
        />
      </div>

      <button
        type="submit"
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800"
      >
        <Search size={17} />
        نمایش گزارش
      </button>

      {employeeId ? (
        <a
          href={`/api/admin/reports/excel?employee=${encodeURIComponent(
            employeeId,
          )}&from=${encodeURIComponent(
            from,
          )}&to=${encodeURIComponent(
            to,
          )}`}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Download size={17} />
          دریافت Excel
        </a>
      ) : null}
    </form>
  );
}