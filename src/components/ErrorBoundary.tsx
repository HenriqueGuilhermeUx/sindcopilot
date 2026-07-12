import React from "react";

type State = { error: Error | null };
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error(error, info); }
  render() {
    const error = this.state.error;
    if (error) return <div className="min-h-screen grid place-items-center p-6"><div className="max-w-lg rounded-xl border bg-card p-8 text-center"><h1 className="text-2xl font-bold">Algo deu errado</h1><p className="mt-3 text-muted-foreground">{error.message}</p><button className="mt-6 rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => location.reload()}>Recarregar</button></div></div>;
    return this.props.children;
  }
}
