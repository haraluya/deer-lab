export function LoadingSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
        </div>
              <p className="mt-4 text-muted-foreground font-medium">正在載入系統...</p>
      <p className="mt-2 text-sm text-muted-foreground">請稍候</p>
      </div>
    </div>
  );
}
