const MONTH_HISTORY = 6;

function buildMonthBuckets(count = MONTH_HISTORY) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
  const buckets = [];

  for (let i = 0; i < count; i += 1) {
    const current = new Date(start.getFullYear(), start.getMonth() + i, 1);
    buckets.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      label: current.toLocaleString("default", { month: "short" }),
    });
  }

  return { buckets, startDate: start };
}

function monthKey(year, month) {
  return `${year}-${month}`;
}

module.exports = {
  MONTH_HISTORY,
  buildMonthBuckets,
  monthKey,
};
