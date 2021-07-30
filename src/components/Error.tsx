export function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="error">
      <p>{message}</p>
    </div>
  );
}
