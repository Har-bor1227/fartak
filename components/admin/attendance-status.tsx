type AttendanceStatusProps = {
    checkIn: Date | null;
    checkOut: Date | null;
  };
  
  export default function AttendanceStatus({
    checkIn,
    checkOut,
  }: AttendanceStatusProps) {
    if (!checkIn) {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
          ثبت نشده
        </span>
      );
    }
  
    if (checkIn && !checkOut) {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          داخل شرکت
        </span>
      );
    }
  
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
        پایان کار
      </span>
    );
  }