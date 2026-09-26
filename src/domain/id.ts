let counter = 0;

/** Short, sortable, collision-resistant id for locally created records. */
export function createId(): string {
  counter = (counter + 1) % 1296;
  const time = Date.now().toString(36);
  const seq = counter.toString(36).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${time}${seq}${random}`;
}
