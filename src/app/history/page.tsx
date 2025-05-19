import HistoryList from "@/components/history-list";

export default function HistoryPage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-full py-2">
      <h1 className="text-3xl font-bold text-center text-primary mb-2">
        Study History
      </h1>
      <p className="text-center text-muted-foreground mb-8 max-w-md">
        Review your past analyzed problems and reinforce your learning.
      </p>
      <HistoryList />
    </div>
  );
}
