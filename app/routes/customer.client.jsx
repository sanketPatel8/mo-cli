import { useEffect, useState } from "react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch("/customers");
        const data = await res.json();
        setCustomers(data);
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  if (loading) return <p>Loading customers...</p>;

  return (
    <div>
      <h1>Customers</h1>
      <ul>
        {customers.map((c) => (
          <li key={c.id}>
            {c.first_name} {c.last_name} ({c.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
