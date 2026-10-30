const input =
  'min-h-[42px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-teal-700 focus:ring-[3px] focus:ring-teal-700/15'

const btn =
  'min-h-10 cursor-pointer justify-self-start rounded-lg border px-[18px] py-2.5 text-sm font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60'

const rowBtn =
  'mr-1.5 my-0.5 cursor-pointer rounded-md border px-[11px] py-[7px] text-xs font-semibold'

const message = 'mb-[18px] rounded-lg border px-3.5 py-3 text-sm'

export const ui = {
  // page + headings
  page: 'mx-auto w-full max-w-[1200px] p-4 text-gray-800 sm:p-6',
  h1: 'mb-6 text-2xl font-bold text-gray-900 sm:text-[28px]',
  h2: 'mb-4 mt-7 text-xl font-semibold text-gray-900',
  hr: 'my-7 border-0 border-t border-gray-200',

  // form
  form: 'grid grid-cols-1 gap-x-5 gap-y-[18px] rounded-2xl border border-gray-200 bg-white p-[18px] shadow-[0_4px_16px_rgb(15_23_42/5%)] sm:grid-cols-2 sm:p-6',
  field: 'flex min-w-0 flex-col gap-[7px]',
  fieldFull: 'flex min-w-0 flex-col gap-[7px] sm:col-span-2',
  label: 'text-[13px] font-semibold text-gray-700',
  input,
  textarea: `${input} min-h-[86px] resize-y`,
  actions: 'flex gap-2.5 sm:col-span-2',
  btnPrimary: `${btn} border-transparent bg-teal-700 text-white hover:bg-teal-800`,
  btnSecondary: `${btn} border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200`,

  // messages
  error: `${message} border-red-200 bg-red-50 text-red-700`,
  success: `${message} border-green-200 bg-green-50 text-green-800`,
  hint: 'mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800',

  // search + filter
  toolbar: 'mb-3.5 flex flex-wrap gap-3',
  search: `${input} flex-[1_1_260px]`,
  filter: `${input} w-auto flex-[0_0_200px]`,
  count: 'mb-2.5 text-[13px] text-gray-500',

  // table
  tableWrap: 'w-full overflow-x-auto rounded-xl border border-gray-200 bg-white',
  table: 'w-full border-collapse text-left text-sm',
  thead: 'bg-gray-50',
  th: 'whitespace-nowrap border-b border-gray-200 px-[15px] py-[13px] align-middle text-xs font-bold uppercase tracking-wider text-gray-600',
  tr: 'hover:bg-gray-50 [&:last-child>td]:border-b-0',
  td: 'border-b border-gray-200 px-[15px] py-[13px] align-middle text-gray-700',
  btnEdit: `${rowBtn} border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100`,
  btnDelete: `${rowBtn} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`,

  // status badge
  badge: 'inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-bold tracking-wide',
}

// Badge colours for every status used in the app.
export const badgeTone: Record<string, string> = {
  // vehicle
  AVAILABLE: 'bg-green-100 text-green-800',
  BOOKED: 'bg-blue-100 text-blue-800',
  RENTED: 'bg-violet-100 text-violet-800',
  MAINTENANCE: 'bg-amber-100 text-amber-800',
  // rental
  ONGOING: 'bg-blue-100 text-blue-800',
  // booking
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-800',
  // category / branch / user
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-red-100 text-red-700',
  // document
  VALID: 'bg-green-100 text-green-800',
  EXPIRING: 'bg-amber-100 text-amber-800',
  EXPIRED: 'bg-red-100 text-red-700',
  INVALID: 'bg-gray-100 text-gray-600',
  // maintenance
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  // invoice
  DRAFT: 'bg-gray-100 text-gray-600',
  ISSUED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  // payment
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-violet-100 text-violet-800',

}
