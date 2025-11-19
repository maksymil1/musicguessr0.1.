import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Test() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await supabase.from("tmp").select("*");

        if (response.error) throw response.error;

        setRows(response.data ?? []);
      } catch (err: any) {
        setError(err.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="container mt-5">
      <div className="card shadow">
        <div className="card-body">
          <h1 className="card-title display-4 mb-4">
            Vite + Supabase = Działa!
          </h1>
          <hr />

          {loading && (
            <div className="alert alert-info">Ładowanie danych z bazy...</div>
          )}

          {error && (
            <div className="alert alert-danger">
              <strong>Błąd połączenia:</strong> {error}
              <br />
              <small>Sprawdź plik .env i istnienie tabeli 'tmp'.</small>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="alert alert-warning">
              Połączono z bazą, ale tabela <strong>tmp</strong> jest pusta.
            </div>
          )}

          {rows.length > 0 && (
            <div className="alert alert-success">
              <h4 className="alert-heading">Sukces!</h4>
              <p>Znaleziono {rows.length} rekordów:</p>
              <pre className="bg-white p-3 border rounded">
                {JSON.stringify(rows, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
