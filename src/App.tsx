import React from "react";
import { AppProvider, useApp } from "./context";
import Login from "./components/Login";
import RestablecerPassword from "./components/RestablecerPassword";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Inventario from "./components/Inventario";
import Movimientos from "./components/Movimientos";
import Herramientas from "./components/Herramientas";
import Reportes from "./components/Reportes";
import Usuarios from "./components/Usuarios";
import Ayuda from "./components/Ayuda";
import Respaldo from "./components/Respaldo";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error capturado por ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--background)] p-6 text-center">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">
              Se produjo un error al cargar la vista
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mb-6">
              {this.state.error?.message || "Ocurrió un error inesperado al conectar o procesar los datos."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-primary w-full"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { usuarioActual, vistaActual, debeCambiarPassword } = useApp();

  if (debeCambiarPassword) return <RestablecerPassword />;

  if (!usuarioActual) return <Login />;

  const views: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    inventario: <Inventario />,
    movimientos: <Movimientos />,
    herramientas: <Herramientas />,
    reportes: <Reportes />,
    usuarios: <Usuarios />,
    respaldo: <Respaldo />,
    ayuda: <Ayuda />,
  };

  return (
    <Layout>
      {views[vistaActual] ?? <Dashboard />}
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

