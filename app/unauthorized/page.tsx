export default function UnauthorizedPage() {
    return (
      <main
        dir="rtl"
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-slate-50
          px-4
        "
      >
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            !
          </div>
  
          <h1 className="mt-5 text-xl font-bold text-slate-900">
            دسترسی غیرمجاز
          </h1>
  
          <p className="mt-2 text-sm leading-6 text-slate-500">
            شما اجازه دسترسی به این بخش را ندارید.
          </p>
        </div>
      </main>
    );
  }